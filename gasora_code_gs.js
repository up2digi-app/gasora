/**
 * ========================================================
 * GASORA CMS HUB BACKEND v1.4.0
 * Single File Architecture (Code.gs)
 * Standalone Web App Version - Production Security Hardened
 * ========================================================
 */

// ========================================================
// CONFIG & CONSTANT
// ========================================================
const SPREADSHEET_ID = '1SJpuzsKoR1kcFAYF3AJcK7dLKHf2-NjWKvd7hO6U_5A';
const CACHE = CacheService.getScriptCache();
const CACHE_KEY_LANDING = 'GASORA_LANDING_DATA_V1';
// Mengurangi waktu cache menjadi 15 menit (900 detik) untuk responsivitas edit
const CACHE_EXPIRATION = 900; 
const ADMIN_EMAIL = 'digifood.id@gmail.com'; // Change as needed
const API_VERSION = 'v1.4.0';
const BUILD_TAG = 'PRODUCTION-SECURE-HOTFIX-41C-FINAL-TS-v1';

// Valid Sheet Names
const TAB_SETTINGS = 'SETTINGS';
const TAB_SHOWCASE = 'SHOWCASE';
const TAB_PRICING = 'PRICING';
const TAB_PRICING_FEATURES = 'PRICING_FEATURES';
const TAB_FAQ = 'FAQ';
const TAB_TESTIMONIAL = 'TESTIMONIAL';
const TAB_BLOG = 'BLOG';
const TAB_SOCIAL = 'SOCIAL';
const TAB_LEADS = 'LEADS';
const TAB_USERS = 'USERS';

// ========================================================
// DATABASE HELPER
// ========================================================
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    throw new Error("Spreadsheet GASORA tidak ditemukan atau belum memiliki akses.");
  }
}

// ========================================================
// doGet() - Main Entry Point for GET Requests
// ========================================================
function doGet(e) {
  const startTime = Date.now();
  e = e || {};
  e.parameter = e.parameter || {};
  
  let rawAction = e.parameter.action || 'health';

  try {
    const response = routeGet(rawAction, e);
    logExecution(rawAction, 'GET', startTime, response);
    return response;
  } catch (error) {
    const errorResponse = formatError("Internal Server Error (GET)", [error.toString()]);
    logExecution(rawAction, 'GET', startTime, errorResponse);
    return errorResponse;
  }
}

// ========================================================
// doPost() - Main Entry Point for POST Requests
// ========================================================
function doPost(e) {
  const startTime = Date.now();
  e = e || {};
  e.parameter = e.parameter || {};
  let rawAction = "default";

  let payload = {};
  try {
    // Universal Payload Parser
    // Prioritas 1: Parse JSON dari e.postData.contents
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (eParse) {
        // Prioritas 2: Fallback parameter form urlencoded
        payload = e.parameter || {};
      }
    } else if (e.parameter) {
      // Prioritas 2: Pengecekan ekstra dari e.parameter
      if (e.parameter.payload) {
        try {
          payload = JSON.parse(e.parameter.payload);
        } catch (eParse2) {
          payload = e.parameter;
        }
      } else {
        payload = e.parameter;
      }
    }

    // Ambil action dari root payload TERLEBIH DAHULU 
    // Mencegah action tertimpa/hilang jika ada payload.data
    rawAction = payload.action || payload.route || payload.type || e.parameter.action || "default";

    // Prioritas 3 & 4: Jika dibungkus dalam payload.data, ekstrak object tersebut
    let finalPayload = (payload && payload.data) ? payload.data : payload;
    
    // Jika ternyata action tidak ada di root, cari kembali di dalam finalPayload
    if (rawAction === "default" || !rawAction) {
      rawAction = finalPayload.action || finalPayload.route || finalPayload.type || "default";
    }

    // Universal Action Router (Lowercase, hilangkan spasi/dash/underscore)
    const action = String(rawAction).toLowerCase().replace(/[\s\-_]/g, "");

    const response = routePost(action, finalPayload);
    logExecution(action, 'POST', startTime, response);
    return response;

  } catch (error) {
    const errorResponse = formatError("Internal Server Error (POST)", [error.toString()]);
    logExecution(rawAction, 'POST', startTime, errorResponse);
    return errorResponse;
  }
}

// ========================================================
// doOptions() - Preflight CORS Support
// ========================================================
function doOptions(e) {
  // Menangani request preflight OPTIONS untuk CORS produksi dari browser modern.
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ========================================================
// Router (Backward Compatibility Normalization)
// ========================================================
function routeGet(rawAction, e) {
  const action = String(rawAction).toLowerCase().replace(/[\s\-_]/g, "");

  switch (action) {
    // API Core
    case 'health': return handleHealth();
    case 'version': return getVersion();
    case 'landing': return handleLanding(e); 
    
    // CMS API (Read)
    case 'dashboard': return handleDashboard();
    case 'getsettings': return getSettings();
    case 'getshowcase': return getShowcase();
    case 'getpricing': return getPricing();
    case 'getpricingfeatures': return getPricingFeatures();
    case 'getfaq': return getFaq();
    case 'gettestimonial': return getTestimonial();
    case 'getblog': return getBlog();
    case 'getsocial': return getSocial();
    
    // Alias API
    case 'getleads': 
    case 'leads': 
      return getLeads(e); 
      
    case 'getusers': return getUsers();
    
    default:
      return formatError("Invalid GET Action Route", ["Action not found: " + rawAction]);
  }
}

function routePost(action, payload) {
  switch (action) {
    // Auth
    case 'login': return handleLogin(payload.username, payload.password);
    
    // Universal Lead API Router
    case 'submitlead':
    case 'createlead':
    case 'lead':
    case 'leads':
    case 'savelead':
      return createLead(payload);

    // Settings
    case 'updatesettings': return updateSettings(payload);

    // Showcase
    case 'createshowcase': return createShowcase(payload);
    case 'updateshowcase': return updateShowcase(payload.id, payload);
    case 'deleteshowcase': return deleteShowcase(payload.id, payload.role);

    // Pricing
    case 'createpricing': return createPricing(payload);
    case 'updatepricing': return updatePricing(payload.package_id, payload); 
    case 'deletepricing': return deletePricing(payload.package_id, payload.role);

    // Pricing Features
    case 'createpricingfeature': return createPricingFeature(payload);
    case 'updatepricingfeature': return updatePricingFeature(payload.id, payload);
    case 'deletepricingfeature': return deletePricingFeature(payload.id, payload.role);

    // FAQ
    case 'createfaq': return createFaq(payload);
    case 'updatefaq': return updateFaq(payload.id, payload);
    case 'deletefaq': return deleteFaq(payload.id, payload.role);

    // Testimonial
    case 'createtestimonial': return createTestimonial(payload);
    case 'updatetestimonial': return updateTestimonial(payload.id, payload);
    case 'deletetestimonial': return deleteTestimonial(payload.id, payload.role);

    // Blog
    case 'createblog': return createBlog(payload);
    case 'updateblog': return updateBlog(payload.id, payload);
    case 'deleteblog': return deleteBlog(payload.id, payload.role);

    // Social
    case 'createsocial': return createSocial(payload);
    case 'updatesocial': return updateSocial(payload.id, payload);
    case 'deletesocial': return deleteSocial(payload.id, payload.role);

    // Leads (CMS Write)
    case 'updateleadstatus': return updateLeadStatus(payload.id, payload);
    case 'deletelead': return deleteLead(payload.id, payload.role);

    // Users
    case 'createuser': return createUser(payload);
    case 'updateuser': return updateUser(payload.id, payload);
    case 'deleteuser': return deleteUser(payload.id, payload.role);

    default:
      return formatError("Invalid POST Action Route", ["Action not found: " + action]);
  }
}

// ========================================================
// Authentication Engine (Security Hardened)
// ========================================================
function handleLogin(username, password) {
  // Strict sanitization & validation
  const cleanUser = String(username || "").trim();
  const cleanPass = String(password || "").trim();

  if (!cleanUser || !cleanPass) {
    return formatError("Validation Error", ["Username & Password required"]);
  }
  
  const users = getSheetDataAsObjects(TAB_USERS);
  const passHash = hashPassword(cleanPass);
  
  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    
    // Strict comparison: Only hash vs hash. Legacy plaintext comparison is REMOVED.
    if (String(user.username).trim() === cleanUser && String(user.password_hash).trim() === passHash) {
      if (!isTrue(user.status)) {
        return formatError("Auth Error", ["Account is inactive"]);
      }
      
      // Update last_login
      const now = getFormattedTimestamp();
      const rowIndex = findRowIndexById(TAB_USERS, 'id', user.id);
      
      if (rowIndex > -1) {
        try {
          const sheet = getSpreadsheet().getSheetByName(TAB_USERS);
          const headers = sheet.getDataRange().getValues()[0];
          const colIndex = headers.indexOf('last_login') + 1;
          if (colIndex > 0) sheet.getRange(rowIndex, colIndex).setValue(now);
        } catch(err) {
          Logger.log("Failed to update last_login: " + err.toString());
        }
      }
      
      // Strict exact field return (Never expose password / hashes)
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Login successful",
        data: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          last_login: now
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: "Auth Error",
    errors: ["Invalid credentials"]
  })).setMimeType(ContentService.MimeType.JSON);
}

// ========================================================
// Migration Helper for Password Security
// ========================================================
function migrateUsersPasswordHash() {
  const sheet = getSpreadsheet().getSheetByName(TAB_USERS);
  if (!sheet) {
    Logger.log("USERS sheet not found for migration.");
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
     Logger.log("No users found to migrate.");
     return;
  }
  
  const headers = data[0];
  const passHashIndex = headers.indexOf('password_hash');
  
  if (passHashIndex === -1) {
     Logger.log("password_hash column not found. Cannot migrate.");
     return;
  }
  
  // Validation for SHA-256 pattern (64 hex characters)
  const sha256Regex = /^[a-f0-9]{64}$/i;
  let migratedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    let currentHash = String(data[i][passHashIndex]).trim();
    
    if (currentHash && !sha256Regex.test(currentHash)) {
      // Detected plaintext legacy password, upgrading to SHA-256
      let newHash = hashPassword(currentHash);
      sheet.getRange(i + 1, passHashIndex + 1).setValue(newHash);
      migratedCount++;
    }
  }
  Logger.log(`Migration complete. Migrated ${migratedCount} users to SHA-256 hash.`);
}

// ========================================================
// Landing API & System
// ========================================================
function getVersion() {
  return formatSuccess("API Version Information", {
    version: API_VERSION,
    build: BUILD_TAG,
    environment: "production",
    timestamp: getFormattedTimestamp()
  });
}

function handleHealth() {
  try {
    const ss = getSpreadsheet();
    return formatSuccess("System Online", {
      status: "online",
      spreadsheet: ss.getName(),
      timestamp: getFormattedTimestamp()
    });
  } catch (err) {
    return formatError("Database Error", [err.toString()]);
  }
}

function handleLanding(e) {
  const startTime = new Date().getTime();

  // 1. Fetch & Parse Settings (Flat Structure v1.1 Backward Compatible)
  const rawSettings = getSheetDataAsObjects(TAB_SETTINGS);
  const settingsObj = {};
  rawSettings.forEach(row => { if (row.field_name) settingsObj[row.field_name] = row.value; });

  // 2. Fetch all required sheets and Normalize Fields (Booleans & Status)
  const rawShowcase = getSheetDataAsObjects(TAB_SHOWCASE).map(normalizeEntity);
  const rawPricing = getSheetDataAsObjects(TAB_PRICING).map(normalizeEntity);
  const rawPricingFeatures = getSheetDataAsObjects(TAB_PRICING_FEATURES).map(normalizeEntity);
  const rawFaq = getSheetDataAsObjects(TAB_FAQ).map(normalizeEntity);
  const rawTestimonial = getSheetDataAsObjects(TAB_TESTIMONIAL).map(normalizeEntity);
  const rawBlog = getSheetDataAsObjects(TAB_BLOG).map(normalizeEntity);
  const rawSocial = getSheetDataAsObjects(TAB_SOCIAL).map(normalizeEntity);

  // 3. Shape Data (Identical to original payload, NO Array Transformation)
  const data = {
    settings: settingsObj,
    showcase: sortData(rawShowcase.filter(isPublished)),
    pricing: sortData(rawPricing.filter(isPublished)),
    pricing_features: sortData(rawPricingFeatures), 
    faq: sortData(rawFaq.filter(isPublished)),
    testimonial: sortData(rawTestimonial.filter(isPublished)),
    blog: sortData(rawBlog.filter(isPublished)),
    social: sortData(rawSocial.filter(isPublished))
  };

  // 4. Debug Mode Interceptor (?action=landing&debug=1)
  if (e && e.parameter && (e.parameter.debug === '1' || e.parameter.debug === 'true')) {
    return ContentService.createTextOutput(JSON.stringify({
      counts: {
        showcase: data.showcase.length,
        pricing: data.pricing.length,
        pricing_features: data.pricing_features.length,
        faq: data.faq.length,
        testimonial: data.testimonial.length,
        blog: data.blog.length,
        social: data.social.length
      },
      timing: {
        fetch_time_ms: new Date().getTime() - startTime
      },
      cache: false
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Realtime execution: Cache fully bypassed for frontend consistency
  return formatSuccess("Landing data fetched successfully", data);
}

// ========================================================
// Dashboard API
// ========================================================
function handleDashboard() {
  // Fetch ALL data without filtering by active status for CMS Admin
  const rawSettings = getSheetDataAsObjects(TAB_SETTINGS);
  const settingsObj = {};
  rawSettings.forEach(row => { if (row.field_name) settingsObj[row.field_name] = row.value; });

  const data = {
    settings: settingsObj,
    showcase: getSheetDataAsObjects(TAB_SHOWCASE),
    pricing: getSheetDataAsObjects(TAB_PRICING),
    pricing_features: getSheetDataAsObjects(TAB_PRICING_FEATURES),
    faq: getSheetDataAsObjects(TAB_FAQ),
    testimonial: getSheetDataAsObjects(TAB_TESTIMONIAL),
    blog: getSheetDataAsObjects(TAB_BLOG),
    social: getSheetDataAsObjects(TAB_SOCIAL),
    leads: getSheetDataAsObjects(TAB_LEADS),
    users: sanitizeUsersOutput(getSheetDataAsObjects(TAB_USERS))
  };

  return formatSuccess("Dashboard data loaded", data);
}

// ========================================================
// Settings CRUD
// ========================================================
function getSettings() {
  const rawSettings = getSheetDataAsObjects(TAB_SETTINGS);
  const settingsObj = {};
  rawSettings.forEach(row => { if (row.field_name) settingsObj[row.field_name] = row.value; });
  return formatSuccess("Settings fetched", settingsObj);
}

function updateSettings(payload) {
  const sheet = getSpreadsheet().getSheetByName(TAB_SETTINGS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let fieldCol = headers.indexOf('field_name');
  let valCol = headers.indexOf('value');

  for (let key in payload) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][fieldCol] === key) {
        sheet.getRange(i + 1, valCol + 1).setValue(payload[key]);
        found = true; break;
      }
    }
    if (!found) {
      let newRow = new Array(headers.length).fill("");
      newRow[fieldCol] = key; newRow[valCol] = payload[key];
      sheet.appendRow(newRow);
    }
  }
  clearLandingCache();
  return formatSuccess("Settings updated", {});
}

// ========================================================
// Content Entities CRUD (Showcase, Pricing, etc)
// ========================================================
function getShowcase() { return formatSuccess("Showcase fetched", getSheetDataAsObjects(TAB_SHOWCASE)); }
function createShowcase(payload) { return genericCreate(TAB_SHOWCASE, payload, 'SC'); }
function updateShowcase(id, payload) { return genericUpdate(TAB_SHOWCASE, 'id', id, payload); }
function deleteShowcase(id, role) { return genericDelete(TAB_SHOWCASE, 'id', id, role); }

function getPricing() { return formatSuccess("Pricing fetched", getSheetDataAsObjects(TAB_PRICING)); }
function createPricing(payload) { return genericCreate(TAB_PRICING, payload, 'PR', 'package_id'); }
function updatePricing(id, payload) { return genericUpdate(TAB_PRICING, 'package_id', id, payload); }
function deletePricing(id, role) { return genericDelete(TAB_PRICING, 'package_id', id, role); }

function getPricingFeatures() { return formatSuccess("Pricing Features fetched", getSheetDataAsObjects(TAB_PRICING_FEATURES)); }
function createPricingFeature(payload) { return genericCreate(TAB_PRICING_FEATURES, payload, 'PF'); }
function updatePricingFeature(id, payload) { return genericUpdate(TAB_PRICING_FEATURES, 'id', id, payload); }
function deletePricingFeature(id, role) { return genericDelete(TAB_PRICING_FEATURES, 'id', id, role); }

function getFaq() { return formatSuccess("FAQ fetched", getSheetDataAsObjects(TAB_FAQ)); }
function createFaq(payload) { return genericCreate(TAB_FAQ, payload, 'FQ'); }
function updateFaq(id, payload) { return genericUpdate(TAB_FAQ, 'id', id, payload); }
function deleteFaq(id, role) { return genericDelete(TAB_FAQ, 'id', id, role); }

function getTestimonial() { return formatSuccess("Testimonials fetched", getSheetDataAsObjects(TAB_TESTIMONIAL)); }
function createTestimonial(payload) { return genericCreate(TAB_TESTIMONIAL, payload, 'TS'); }
function updateTestimonial(id, payload) { return genericUpdate(TAB_TESTIMONIAL, 'id', id, payload); }
function deleteTestimonial(id, role) { return genericDelete(TAB_TESTIMONIAL, 'id', id, role); }

function getBlog() { return formatSuccess("Blog fetched", getSheetDataAsObjects(TAB_BLOG)); }
function createBlog(payload) { 
  return genericCreate(TAB_BLOG, payload, 'BL'); 
}
function updateBlog(id, payload) { 
  return genericUpdate(TAB_BLOG, 'id', id, payload); 
}
function deleteBlog(id, role) { return genericDelete(TAB_BLOG, 'id', id, role); }

function getSocial() { return formatSuccess("Social fetched", getSheetDataAsObjects(TAB_SOCIAL)); }
function createSocial(payload) { return genericCreate(TAB_SOCIAL, payload, 'SO'); }
function updateSocial(id, payload) { return genericUpdate(TAB_SOCIAL, 'id', id, payload); }
function deleteSocial(id, role) { return genericDelete(TAB_SOCIAL, 'id', id, role); }

// ========================================================
// Leads & Users CRUD
// ========================================================
function getLeads(e) { 
  e = e || {};
  const params = e.parameter || {};
  
  let leads = getSheetDataAsObjects(TAB_LEADS);

  // Filter Data
  if (params.status) {
    leads = leads.filter(l => String(l.status).toLowerCase() === String(params.status).toLowerCase());
  }
  if (params.service) {
    leads = leads.filter(l => String(l.service).toLowerCase() === String(params.service).toLowerCase());
  }
  if (params.source) {
    leads = leads.filter(l => String(l.source).toLowerCase() === String(params.source).toLowerCase());
  }
  
  // Search Text
  if (params.search) {
    const q = String(params.search).toLowerCase();
    leads = leads.filter(l => 
      (l.name && String(l.name).toLowerCase().includes(q)) ||
      (l.company && String(l.company).toLowerCase().includes(q)) ||
      (l.whatsapp && String(l.whatsapp).toLowerCase().includes(q)) ||
      (l.email && String(l.email).toLowerCase().includes(q))
    );
  }
  
  // Sort DESC - Tanggal Terlama ke Terbaru (DESC = Baru ke Lama)
  leads.sort((a, b) => {
    let dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    let dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  // Pagination
  let page = parseInt(params.page) || 1;
  let limit = parseInt(params.limit) || 20;
  let total = leads.length;
  
  let startIndex = (page - 1) * limit;
  let endIndex = startIndex + limit;
  let paginatedLeads = leads.slice(startIndex, endIndex);

  return formatSuccess("Leads fetched", paginatedLeads, {
    total: total,
    page: page,
    limit: limit,
    total_pages: Math.ceil(total / limit)
  });
}

// ========================================================
// createLead Strict Sheet, Try-Catch & Verify Append
// ========================================================
function createLead(payload) {
  // Payload sudah dinormalisasi dari global parser di doPost
  const lead = payload;
  
  // Validation awal payload input
  if (!lead.name || !lead.whatsapp || !lead.service) {
    return formatError("Validation Error", ["Name, WhatsApp, and Service are required."]);
  }

  Logger.log(`[createLead] Action: submit_lead | Payload: ${JSON.stringify(lead)}`);

  try {
    const ss = getSpreadsheet();
    const sheetName = TAB_LEADS;
    const sheet = ss.getSheetByName(sheetName);
    
    // Validasi Eksistensi Sheet Absolut
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

    // Mapping Row Data Absolut Sesuai Urutan Header
    const id = generateId('LD');
    const created_at = lead.created_at || getFormattedTimestamp();
    const name = lead.name || "";
    const whatsapp = lead.whatsapp ? "'" + String(lead.whatsapp).trim() : "";
    const email = lead.email || "";
    const company = lead.company || "";
    const assigned_to = lead.assigned_to || "";
    const follow_up_date = lead.follow_up_date || "";
    const service = lead.service || "";
    const notes = lead.notes || "";
    const source = lead.source || "Landing GASORA";
    const status = lead.status || "NEW";

    const rowData = [
      id,
      created_at,
      name,
      whatsapp,
      email,
      company,
      assigned_to,
      follow_up_date,
      service,
      notes,
      source,
      status
    ];

    Logger.log(`[createLead] Sheet Name: ${sheetName} | Data Row: ${JSON.stringify(rowData)}`);
    
    // Eksekusi Append Database Absolut
    sheet.appendRow(rowData);

    // Verifikasi Keberhasilan Append
    const lastRow = sheet.getLastRow();
    Logger.log(`[createLead] Last Row: ${lastRow}`);

    if (lastRow <= 1) {
      throw new Error("Failed to append data (lastRow <= 1)");
    }
    
    Logger.log(`[createLead] appendRow Success: TRUE | ID: ${id}`);
    
    // Trigger Email
    sendLeadEmailNotification({
      id: id,
      created_at: created_at,
      name: name,
      whatsapp: whatsapp,
      email: email,
      company: company,
      service: service,
      notes: notes,
      source: source,
      status: status
    });

    // Mengembalikan JSON standar success HANYA jika semua step berhasil
    return formatSuccess("Lead submitted successfully", { lead_id: id });
    
  } catch (err) {
    Logger.log(`[createLead] Append Exception: ${err.toString()}`);
    return formatError("Failed to save lead", [err.toString()]);
  }
}

function updateLeadStatus(id, payload) { return genericUpdate(TAB_LEADS, 'id', id, payload); }
function deleteLead(id, role) { return genericDelete(TAB_LEADS, 'id', id, role); }

function getUsers() { return formatSuccess("Users fetched", sanitizeUsersOutput(getSheetDataAsObjects(TAB_USERS))); }

function createUser(payload) {
  const rawPass = String(payload.password || "").trim();
  
  if (rawPass) {
    // Hash password automatically and store only password_hash
    payload.password_hash = hashPassword(rawPass);
  }
  
  // Remove plaintext password before saving
  delete payload.password; 
  return genericCreate(TAB_USERS, payload, 'USR');
}

function updateUser(id, payload) {
  const rawPass = String(payload.password || "").trim();
  
  if (rawPass) {
    // If password is changed, rehash automatically
    payload.password_hash = hashPassword(rawPass);
  } else {
    // If password is empty, keep existing hash. Never overwrite with empty.
    delete payload.password_hash; 
  }
  
  // Remove plaintext password entirely
  delete payload.password; 
  
  return genericUpdate(TAB_USERS, 'id', id, payload);
}

function deleteUser(id, role) { return genericDelete(TAB_USERS, 'id', id, role); }

// ========================================================
// Centralized Logging
// ========================================================
function logExecution(action, method, startTime, textOutput) {
  try {
    const execTime = Date.now() - startTime;
    let successStatus = "ERROR";
    let errorMsg = "-";
    let rows = 0;
    
    if (textOutput && textOutput.getContent) {
      const jsonStr = textOutput.getContent();
      const jsonObj = JSON.parse(jsonStr);
      
      if (Array.isArray(jsonObj.data)) {
        rows = jsonObj.data.length;
      } else if (jsonObj.data && typeof jsonObj.data === 'object') {
        rows = Object.keys(jsonObj.data).length > 0 ? 1 : 0;
      }
      
      successStatus = jsonObj.success ? "SUCCESS" : "ERROR";
      errorMsg = jsonObj.errors ? jsonObj.errors.join(" | ") : "-";
    }
    
    // Simple Log: Method, Action, Time, Rows, Status, Error
    Logger.log(`[${method}] Action: ${action} | Time: ${execTime}ms | Rows: ${rows} | Status: ${successStatus} | Error: ${errorMsg}`);
  } catch (err) {
    Logger.log(`[${method}] Action: ${action} | Logging failed: ${err.toString()}`);
  }
}

// ========================================================
// Email Notification & Cache Management
// ========================================================
function sendLeadEmailNotification(lead) {
  try {
    const subject = `🔥 Lead Baru: ${lead.name} - ${lead.service}`;
    const body = `
Pemberitahuan Lead Baru dari GASORA Landing Page

Detail Lead:
- Nama: ${lead.name}
- WhatsApp: ${lead.whatsapp.replace("'", "")}
- Email: ${lead.email || '-'}
- Layanan: ${lead.service}
- Catatan: ${lead.notes || '-'}
- Waktu: ${lead.created_at}
- Source: ${lead.source}

Segera buka CMS Dashboard untuk melakukan follow-up.
    `;
    MailApp.sendEmail(ADMIN_EMAIL, subject, body);
  } catch (err) {
    Logger.log("Email send failed: " + err.toString());
  }
}

function getCache(key) {
  return CACHE.get(key);
}

function setCache(key, value) {
  CACHE.put(key, value, CACHE_EXPIRATION);
}

function clearLandingCache() {
  CACHE.remove(CACHE_KEY_LANDING);
}

// ========================================================
// Utility & Helpers (Timestamp Integration CRUD)
// ========================================================
function genericCreate(sheetName, payload, prefix, idField = 'id') {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return formatError("System Error", [`Sheet ${sheetName} not found`]);

  const headers = sheet.getDataRange().getValues()[0];
  const newRow = new Array(headers.length).fill("");
  
  if (!payload[idField]) payload[idField] = generateId(prefix);

  // Auto inject standardized timestamps for new records
  const now = getFormattedTimestamp();
  if (headers.includes('created_at') && !payload.created_at) payload.created_at = now;
  if (headers.includes('updated_at') && !payload.updated_at) payload.updated_at = now;

  for (let i = 0; i < headers.length; i++) {
    if (payload[headers[i]] !== undefined) newRow[i] = payload[headers[i]];
  }
  
  sheet.appendRow(newRow);
  clearLandingCache();
  return formatSuccess(`${sheetName} created successfully`, { [idField]: payload[idField] });
}

function genericUpdate(sheetName, idCol, id, payload) {
  if (!id) return formatError("Validation Error", ["ID is required for update"]);
  const rowIndex = findRowIndexById(sheetName, idCol, id);
  if (rowIndex === -1) return formatError("Not Found", [`Record ID ${id} not found in ${sheetName}`]);

  const sheet = getSpreadsheet().getSheetByName(sheetName);
  const headers = sheet.getDataRange().getValues()[0];
  
  // Auto update standardized timestamps for modification records
  if (headers.includes('updated_at')) payload.updated_at = getFormattedTimestamp();

  for (let i = 0; i < headers.length; i++) {
    let header = headers[i];
    if (payload[header] !== undefined && header !== idCol) {
      sheet.getRange(rowIndex, i + 1).setValue(payload[header]);
    }
  }
  
  clearLandingCache();
  return formatSuccess(`${sheetName} updated successfully`, {});
}

function genericDelete(sheetName, idCol, id, role) {
  if (!id) return formatError("Validation Error", ["ID is required for delete"]);
  if (role === 'editor') return formatError("Unauthorized", ["Role 'editor' cannot delete records"]);

  const rowIndex = findRowIndexById(sheetName, idCol, id);
  if (rowIndex === -1) return formatError("Not Found", [`Record ID ${id} not found in ${sheetName}`]);

  getSpreadsheet().getSheetByName(sheetName).deleteRow(rowIndex);
  clearLandingCache();
  return formatSuccess(`${sheetName} deleted successfully`, {});
}

function getSheetDataAsObjects(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

function findRowIndexById(sheetName, idColumnName, searchId) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if(!sheet) return -1;
  const data = sheet.getDataRange().getValues();
  const idIndex = data[0].indexOf(idColumnName);
  if (idIndex === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex].toString() === searchId.toString()) return i + 1;
  }
  return -1;
}

function generateId(prefix) {
  return `${prefix}-${new Date().getTime().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
}

function hashPassword(password) {
  const cleanPass = String(password || "");
  if (!cleanPass) return "";
  
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, cleanPass);
  return signature.map(byte => ("0" + (byte < 0 ? 256 + byte : byte).toString(16)).slice(-2)).join("").toLowerCase();
}

/**
 * Helper Timestamp Formatter dd/MM/yyyy HH:mm:ss (Asia/Jakarta)
 */
function getFormattedTimestamp() {
  return Utilities.formatDate(
    new Date(),
    "Asia/Jakarta",
    "dd/MM/yyyy HH:mm:ss"
  );
}

function isTrue(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const v = value.toLowerCase().trim();
    return v === 'true' || v === 'yes' || v === '1';
  }
  return false;
}

function normalizeEntity(row) {
  if (row.active !== undefined) {
    row.active = isTrue(row.active); 
  }
  if (row.status !== undefined && row.status !== "") {
    row.status = String(row.status).toLowerCase().trim(); 
  }
  return row;
}

function isPublished(row) {
  if (row.status !== undefined && row.status !== "") {
    return row.status === 'published';
  }
  if (row.active !== undefined) {
    return row.active === true;
  }
  return false; 
}

function sortData(dataArray) {
  return dataArray.sort((a, b) => {
    let orderA = parseFloat(a.sort_order);
    let orderB = parseFloat(b.sort_order);
    if (isNaN(orderA)) orderA = 99999;
    if (isNaN(orderB)) orderB = 99999;
    return orderA - orderB;
  });
}

function sanitizeUsersOutput(usersArray) {
  return usersArray.map(user => {
    let safeUser = { ...user };
    // Always strip all passwords and hashes from the API response
    delete safeUser.password_hash;
    delete safeUser.password;
    return safeUser;
  });
}

// ========================================================
// Response Formatter
// ========================================================
function formatSuccess(message, data, meta = null) {
  // Ekstraksi custom ID fallback prioritas
  let extractedId = "";
  if (data) {
    if (data.id) extractedId = data.id;
    else if (data.lead_id) extractedId = data.lead_id;
    else if (data.package_id) extractedId = data.package_id;
  }

  const payload = {
    success: true,
    message: message,
    id: extractedId,
    timestamp: getFormattedTimestamp(),
    data: data || {}
  };
  
  if (meta) {
    payload.meta = meta; 
  }
  
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatError(message, errors) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: message,
    errors: errors || []
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================
// INSTALL DATABASE 
// ============================
function installDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  function populateSheet(sheetName, data) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    }
    
    if (data && data.length > 0) {
      sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    }
  }

  const settingsData = [
    ["site_name", "GASORA"],
    ["brand_name", "GASORA"],
    ["tagline", "Bangun Aplikasi Bisnis Lebih Cepat"],
    ["logo_url", "https://up2digi-app.github.io/up2digital-assets/gasora/logo.png"],
    ["favicon_url", "https://up2digi-app.github.io/up2digital-assets/gasora/favicon.png"],
    ["hero_title", "Bangun Aplikasi Bisnis Lebih Cepat dengan Google Apps Script"],
    ["hero_subtitle", "Solusi pembuatan aplikasi bisnis modern untuk UMKM, Sekolah, Yayasan, Property, Klinik, Travel, Retail, dan Perusahaan. Tanpa biaya server bulanan, aman, dan mudah digunakan."],
    ["hero_button_text", "Lihat Demo Aplikasi"],
    ["hero_button_url", "#showcase"],
    ["email", "halo@gasora.id"],
    ["whatsapp", "https://wa.link/i8w855"],
    ["address", "Jakarta, Indonesia"],
    ["footer_text", "Part of UP2 Digital Ecosystem"],
    ["copyright", "© 2026 GASORA by UP2 Digi-App. All rights reserved."],
    ["seo_title", "GASORA - Bangun Aplikasi Bisnis Lebih Cepat"],
    ["seo_description", "Jasa pembuatan aplikasi Google Apps Script untuk UMKM, Sekolah, Klinik, Property, Retail dan Perusahaan."],
    ["seo_keywords", "Google Apps Script Indonesia, Jasa Pembuatan Aplikasi, Aplikasi Sekolah, Aplikasi UMKM, Inventory System, CRM Hub, SPMB Online, Dashboard Bisnis"],
    ["canonical_url", "https://gasora.id/"],
    ["og_image", "https://up2digi-app.github.io/up2digital-assets/gasora/logo.png"],
    ["twitter_image", "https://up2digi-app.github.io/up2digital-assets/gasora/logo.png"],
    ["primary_color", "#4F46E5"],
    ["secondary_color", "#06B6D4"]
  ];

  const showcaseData = [
    ["booking", "ops", "Online Booking System", "Reservasi & Jadwal Online", "Sistem reservasi pintar untuk jasa konseling, salon, lapangan olahraga, atau rental kendaraan yang mencegah jadwal bentrok.", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/online-booking-system-dashboard.jpeg", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/online-booking-system-dashboard.jpeg", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/online-booking-system-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Katalog Jasa & Layanan|Kalender Ketersediaan Realtime|Notifikasi Konfirmasi via WA|Integrasi Payment Gateway|Manajemen Reschedule|Laporan Tren Pemesanan", "", 1, true],
    ["crm", "crm", "CRM Customer Management", "Database Klien & Follow Up", "Kelola alur penjualan dari prospek hingga closing. Pastikan tidak ada potensi penjualan yang lepas karena lupa di follow-up oleh tim sales.", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/crm-customer-management-dashboard.jpeg", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/crm-customer-management-dashboard.jpeg", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/crm-customer-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Pipeline Penjualan Visual|Database Kontak Terpusat|Reminder Follow-up|Pencatatan Riwayat Interaksi|Distribusi Leads ke Sales|Analisa Win/Loss Rate", "", 2, true],
    ["cashbank", "finance", "Cash & Bank Management", "Arus Kas & Buku Bank", "Buku kas digital modern untuk merekam setiap transaksi masuk dan keluar dari berbagai rekening bank maupun kas kecil perusahaan.", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/cash-bank-management-dashboard.jpeg", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/cash-bank-management-dashboard.jpeg", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/cash-bank-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Pencatatan Multi-Rekening/Kas|Kategorisasi Pengeluaran|Transfer Antar Rekening|Upload Bukti Kuitansi|Rekonsiliasi Bank Sederhana|Dashboard Grafik Keuangan", "", 3, true],
    ["leave", "hr", "Employee Leave Management", "Pengajuan Cuti & Izin", "Digitalisasi formulir pengajuan cuti, sakit, dan izin karyawan. Dengan sistem approval berjenjang oleh atasan langsung dan pihak HRD.", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/employee-leave-management-dashboard.jpeg", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/employee-leave-management-dashboard.jpeg", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/employee-leave-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Kalkulasi Sisa Saldo Cuti|Form Pengajuan Online|Upload Surat Dokter|Approval Bertingkat|Kalender Cuti Bersama|Notifikasi Email ke Atasan", "", 4, true],
    ["inventory", "retail", "Inventory Management", "Sistem Manajemen Gudang", "Aplikasi manajemen gudang untuk memantau pergerakan stok barang. Cegah kehabisan stok atau penumpukan barang dengan sistem opname terpadu.", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/inventory-management-dashboard.jpeg", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/inventory-management-dashboard.jpeg", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/inventory-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Pencatatan Barang Masuk/Keluar|Manajemen Multi-Gudang|Notifikasi Minimum Stok|Stock Opname Digital|Barcode/SKU Generator|Laporan Pergerakan Barang", "", 5, true],
    ["pos", "retail", "Point of Sale Management", "Sistem Kasir Ritel", "Sistem kasir cerdas untuk mempercepat transaksi di toko fisik Anda. Terhubung langsung dengan inventory untuk pemotongan stok otomatis.", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/retail-pos-dashboard.jpeg", "https://up2digi-app.github.io/up2digital-assets/gasora/demo/retail-pos-dashboard.jpeg", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/point-of-sale-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Antarmuka Kasir Interaktif|Dukungan Barcode Scanner|Cetak Struk/Kirim via WA|Manajemen Diskon/Promo|Multi-Metode Pembayaran|Laporan Shift Kasir", "", 6, true],
    ["apartment", "property", "Apartment Management", "Manajemen Properti & IPL", "Sistem komprehensif untuk mengelola tagihan IPL, data penghuni, dan keluhan (ticketing) di apartemen secara real-time dan terintegrasi.", "", "", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/apartment-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Manajemen Unit & Penghuni|Tagihan IPL Otomatis|Ticketing Keluhan Penghuni|Laporan Keuangan Properti|Integrasi WhatsApp Broadcast|Manajemen Akses Staff", "", 7, true],
    ["kost", "property", "Kost Management", "Manajemen Kos & Sewa", "Aplikasi manajemen kos-kosan untuk melacak jatuh tempo sewa, pengeluaran operasional kos, dan ketersediaan kamar yang kosong.", "", "", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/kost-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Pelacakan Status Kamar|Pengingat Jatuh Tempo Sewa|Pencatatan Biaya Operasional|Invoice Digital|Database Penyewa|Laporan Laba/Rugi Bulanan", "", 8, true],
    ["workorder", "ops", "Work Order Management", "Manajemen Tugas & Maintenance", "Digitalisasi SPK (Surat Perintah Kerja) untuk tim lapangan, maintenance, atau teknisi. Lacak progress pekerjaan hingga tuntas.", "", "", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/work-order-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Pembuatan & Distribusi SPK|Tracking Progress Pekerjaan|Upload Foto Bukti Selesai|Approval Berjenjang|Manajemen Jadwal Teknisi|Riwayat Perawatan Aset", "", 9, true],
    ["invoice", "finance", "Invoice & Receivable", "Manajemen Tagihan & Piutang", "Buat tagihan profesional, kirim ke klien, dan lacak pembayaran otomatis. Pantau piutang macet agar arus kas bisnis tetap sehat.", "", "", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/invoice-receivable-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Generator Invoice PDF|Pelacakan Piutang Klien|Reminder Tagihan Otomatis|Pencatatan Pembayaran Parsial|Katalog Produk/Jasa Dasar|Laporan Rekapitulasi Piutang", "", 10, true],
    ["attendance", "hr", "Employee Attendance", "Absensi Kehadiran Online", "Sistem presensi modern berbasis web yang mendukung check-in dan check-out dari perangkat masing-masing karyawan beserta pelacakan lokasi.", "", "", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/employee-attendance-management-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Check-in/out via Web|Perekaman Lokasi Geolocation|Dukungan Foto Selfie|Laporan Keterlambatan|Manajemen Shift Kerja|Rekap Jam Kerja Bulanan", "", 11, true],
    ["purchasing", "retail", "Purchasing & Procurement", "Manajemen Pembelian", "Lacak semua proses pengadaan barang mulai dari Purchase Requisition, pembuatan Purchase Order ke supplier, hingga penerimaan barang.", "", "", "", "published", "", "https://up2digi-app.github.io/up2digital-assets/gasora/showcase/purchasing-procurement-demo.html", "Pesan Aplikasi", "https://wa.link/i8w855", "Pembuatan Purchase Order (PO)|Database Supplier/Vendor|Approval Pengadaan|Pencocokan Barang Diterima|Pelacakan Status Pesanan|Laporan Biaya Pembelian", "", 12, true]
  ];

  const pricingData = [
    ["demo", "DEMO", "Gratis", "Coba pengalaman menggunakan ekosistem GASORA.", false, "Coba Demo", "#showcase", "", "", 1, true],
    ["lite", "LITE", "Mulai 299rb", "Cocok untuk UMKM dan bisnis skala kecil.", false, "Pilih Lite", "https://wa.link/i8w855", "", "", 2, true],
    ["pro", "PRO", "Mulai 999rb", "Untuk bisnis berkembang dengan kebutuhan spesifik.", true, "Konsultasi Pro", "https://wa.link/i8w855", "POPULAR", "indigo", 3, true],
    ["custom", "CUSTOM", "Konsultasi", "Sistem kompleks & ekosistem utuh untuk perusahaan.", false, "Hubungi Sales", "https://wa.link/i8w855", "", "accent", 4, true]
  ];

  const pricingFeaturesData = [
    ["pf_1", "demo", "Akses Demo", 1],
    ["pf_2", "demo", "Dummy Data", 2],
    ["pf_3", "demo", "Trial Experience", 3],
    ["pf_4", "lite", "1 Modul", 4],
    ["pf_5", "lite", "Spreadsheet Database", 5],
    ["pf_6", "lite", "Dashboard Basic", 6],
    ["pf_7", "lite", "Setup Cepat", 7],
    ["pf_8", "pro", "Multi Modul", 8],
    ["pf_9", "pro", "Dashboard Modern", 9],
    ["pf_10", "pro", "WhatsApp Integration", 10],
    ["pf_11", "pro", "Custom Branding", 11],
    ["pf_12", "custom", "Full Custom Development", 12],
    ["pf_13", "custom", "Multi Role", 13],
    ["pf_14", "custom", "Multi Cabang", 14],
    ["pf_15", "custom", "Enterprise Workflow", 15]
  ];

  const faqData = [
    ["faq_1", "1. Apa itu GASORA?", "GASORA adalah layanan pembuatan aplikasi bisnis kustom yang dibangun di atas infrastruktur Google Apps Script. Memungkinkan pembuatan Web App dengan database Google Sheets/Drive.", 1, true],
    ["faq_2", "2. Berapa lama proses pembuatan aplikasi?", "Tergantung kompleksitas. Paket LITE biasanya memakan waktu 7-14 hari kerja, sementara PRO dan Enterprise bisa 3-6 minggu.", 2, true],
    ["faq_3", "3. Apakah data saya aman?", "Sangat aman. Database disimpan di akun Google Workspace/Drive Anda sendiri. Kami hanya mendeploy script-nya. Keamanan dijamin standar enkripsi Google.", 3, true],
    ["faq_4", "4. Apakah perlu bayar server bulanan?", "Tidak. Karena menggunakan ekosistem Google Apps Script, hosting backend dan database (spreadsheet) sepenuhnya gratis di bawah limit kuota Google standard.", 4, true],
    ["faq_5", "5. Apakah bisa request custom fitur?", "Tentu, itu spesialisasi kami. Paket PRO dan Enterprise dirancang khusus untuk kustomisasi flow bisnis Anda 100%.", 5, true],
    ["faq_6", "6. Apakah aplikasi bisa diakses di HP?", "Ya, Web App yang kami kembangkan menggunakan framework frontend responsif modern (seperti Tailwind CSS), sehingga tampil rapi di HP layaknya aplikasi native (PWA).", 6, true],
    ["faq_7", "7. Apa bedanya dengan App Builder lain?", "GASORA membangun custom code (HTML/JS/GAS) sehingga tidak ada batasan UI atau limit user pricing bulanan per-seat seperti AppSheet/Glide. Anda bayar development sekali.", 7, true],
    ["faq_8", "8. Apakah ada garansi / maintenance?", "Setiap paket sudah termasuk support bug fixing (1-3 bulan). Setelah itu Anda dapat memilih opsi retainer maintenance jika dibutuhkan perlindungan jangka panjang.", 8, true],
    ["faq_9", "9. Bisa integrasi WhatsApp / Email?", "Bisa. Notifikasi Email otomatis bawaan Google (gratis). Untuk WhatsApp, kami bisa mengintegrasikannya dengan provider API WhatsApp pihak ketiga pilihan Anda.", 9, true],
    ["faq_10", "10. Bagaimana cara memulainya?", "Klik tombol \"Konsultasi Gratis\" di website ini. Tim analis kami akan menjadwalkan meeting (online/offline) untuk memetakan kebutuhan Anda tanpa biaya komitmen.", 10, true]
  ];

  const testimonialData = [
    ["testi_1", "Budi Santoso", "Owner Retail Tech", "", "", "Sistem kasir dan inventory dari GASORA benar-benar menyelamatkan bisnis retail kami. Tidak perlu sewa server, sangat hemat!", 5, 1, true],
    ["testi_2", "Aisyah", "Kepala Tata Usaha Yayasan", "", "", "Aplikasi tabungan siswa untuk yayasan kami kini digital 100%. Wali murid bisa cek saldo via link, sangat transparan dan memuaskan.", 5, 2, true],
    ["testi_3", "Daniel", "Marketing Director Property", "", "", "CRM yang dikembangkan tim GASORA sangat custom sesuai flow kerja property kami. Follow up leads jadi lebih terukur.", 5, 3, true]
  ];

  const blog1Content = `<p class="lead">Mencatat stok barang secara manual adalah mimpi buruk...</p>`;
  const blog2Content = `<p class="lead">Di era transformasi digital, bertahan dengan pencatatan manual...</p>`;
  const blog3Content = `<p class="lead">Sama-sama lahir dari ekosistem Google, namun memiliki pendekatan...</p>`;
  const blog4Content = `<p class="lead">Jangan biarkan uang Anda terbuang karena leads yang lupa di-follow up...</p>`;
  const blog5Content = `<p class="lead">Sistem Pendaftaran Siswa/Mahasiswa Baru (SPMB) adalah gerbang pertama...</p>`;
  const blog6Content = `<p class="lead">Data yang menumpuk tidak ada artinya jika tidak bisa dibaca...</p>`;

  const blogData = [
    ["blog1", "cara-membuat-aplikasi-inventory-dengan-google-apps-script", "Cara Membuat Aplikasi Inventory dengan Google Apps Script", "Tutorial", "Panduan langkah demi langkah...", blog1Content, "", "GASORA Team", "17 Jun 2026", "published", false, "Cara Membuat Aplikasi Inventory", "Panduan langkah demi langkah...", "", 1, "17/06/2026 10:00:00", "17/06/2026 10:00:00"],
    ["blog2", "5-alasan-umkm-harus-segera-digitalisasi-data", "5 Alasan UMKM Harus Segera Digitalisasi Data", "Bisnis", "Meninggalkan pencatatan manual...", blog2Content, "", "GASORA Team", "15 Jun 2026", "published", false, "5 Alasan UMKM Harus Segera Digitalisasi Data", "Meninggalkan pencatatan manual...", "", 2, "15/06/2026 10:00:00", "15/06/2026 10:00:00"],
    ["blog3", "google-apps-script-vs-appsheet-mana-yang-terbaik", "Google Apps Script vs AppSheet: Mana yang Terbaik?", "Komparasi", "Analisis mendalam membandingkan...", blog3Content, "", "GASORA Team", "10 Jun 2026", "published", false, "Google Apps Script vs AppSheet", "Analisis mendalam...", "", 3, "10/06/2026 10:00:00", "10/06/2026 10:00:00"],
    ["blog4", "cara-membuat-crm-murah-namun-powerful-untuk-umkm", "Cara Membuat CRM Murah namun Powerful untuk UMKM", "Strategi", "Jangan biarkan leads Anda terbengkalai...", blog4Content, "", "GASORA Team", "05 Jun 2026", "published", false, "Cara Membuat CRM Murah namun Powerful", "Jangan biarkan leads Anda terbengkalai...", "", 4, "05/06/2026 10:00:00", "05/06/2026 10:00:00"],
    ["blog5", "membangun-sistem-spmb-online-yang-ramah-pengguna", "Membangun Sistem SPMB Online yang Ramah Pengguna", "Edukasi", "Tips merancang alur pendaftaran siswa baru...", blog5Content, "", "GASORA Team", "01 Jun 2026", "published", false, "Membangun Sistem SPMB Online", "Tips merancang alur...", "", 5, "01/06/2026 10:00:00", "01/06/2026 10:00:00"],
    ["blog6", "panduan-dashboard-bisnis-modern-data-menjadi-visual", "Panduan Dashboard Bisnis Modern: Data Menjadi Visual", "Desain UI/UX", "Menyajikan data ribuan baris menjadi...", blog6Content, "", "GASORA Team", "25 Mei 2026", "published", false, "Panduan Dashboard Bisnis Modern", "Menyajikan data ribuan baris...", "", 6, "25/05/2026 10:00:00", "25/05/2026 10:00:00"]
  ];

  const socialData = [
    ["WhatsApp", "https://wa.link/i8w855", "ph-whatsapp-logo", true, 1],
    ["Instagram", "", "ph-instagram-logo", true, 2],
    ["Facebook", "", "ph-facebook-logo", true, 3],
    ["Youtube", "", "ph-youtube-logo", true, 4],
    ["LinkedIn", "", "ph-linkedin-logo", true, 5],
    ["TikTok", "", "ph-tiktok-logo", true, 6],
    ["Github", "", "ph-github-logo", true, 7],
    ["Website", "https://gasora.id", "ph-globe", true, 8],
    ["Email", "halo@gasora.id", "ph-envelope-simple", true, 9]
  ];

  populateSheet("SETTINGS", settingsData);
  populateSheet("SHOWCASE", showcaseData);
  populateSheet("PRICING", pricingData);
  populateSheet("PRICING_FEATURES", pricingFeaturesData);
  populateSheet("FAQ", faqData);
  populateSheet("TESTIMONIAL", testimonialData);
  populateSheet("BLOG", blogData);
  populateSheet("SOCIAL", socialData);
}