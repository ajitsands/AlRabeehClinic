using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using BH.CIO.Smartcard.IDCardManager;
using BH.CIO.Smartcard.Data;

namespace AlRabeesh.SmartCard
{
    class Program
    {
        private static HttpListener _listener;
        private static CardManager _cardManager;
        private static readonly object _lock = new object();
        private static int _activePort = 5050;

        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.Title = "Al Rabeesh Dental - Bahrain Smart Card Bridge (Port 5050)";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("=========================================================================");
            Console.WriteLine("  Al Rabeesh Dental Center - Bahrain CPR Smart Card Bridge 2026");
            Console.WriteLine("  Supporting: Old CPR Cards (Front Chip) & New 2025/2026 (Back Chip)");
            Console.WriteLine("  Port: 5050 | REST & HTML Diagnostics");
            Console.WriteLine("=========================================================================");
            Console.ResetColor();
            Console.WriteLine();

            try
            {
                InitializeCardManager();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("[SDK Warning] CardManager init: " + ex.Message);
                Console.ResetColor();
            }

            StartHttpServer();
        }

        private static void InitializeCardManager()
        {
            lock (_lock)
            {
                if (_cardManager != null)
                {
                    try { _cardManager.ShutDownSCManager(); } catch { }
                    try { _cardManager.Dispose(); } catch { }
                    _cardManager = null;
                }

                _cardManager = new CardManager();
                _cardManager.InitializesSCReaderLibrary();
                
                string readerName = _cardManager.SelectedReaderName;
                if (string.IsNullOrEmpty(readerName))
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("[Hardware] No USB Smart Card Reader detected yet. Please plug in the reader.");
                    Console.ResetColor();
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("[Hardware] Connected USB Reader: " + readerName);
                    Console.ResetColor();
                }
            }
        }

        private static void StartHttpServer()
        {
            bool listening = false;

            // Strategy 1: Try wildcard http://+:5050/ (covers localhost, 127.0.0.1, LAN)
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://+:5050/");
                _listener.Start();
                listening = true;
                _activePort = 5050;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Notice (+:5050): " + ex.Message);
            }

            // Strategy 2: Try specific localhost and 127.0.0.1 prefixes
            if (!listening)
            {
                try
                {
                    _listener = new HttpListener();
                    _listener.Prefixes.Add("http://localhost:5050/");
                    _listener.Prefixes.Add("http://127.0.0.1:5050/");
                    _listener.Start();
                    listening = true;
                    _activePort = 5050;
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Notice (localhost:5050): " + ex.Message);
                }
            }

            // Strategy 3: Try 127.0.0.1 only
            if (!listening)
            {
                try
                {
                    _listener = new HttpListener();
                    _listener.Prefixes.Add("http://127.0.0.1:5050/");
                    _listener.Start();
                    listening = true;
                    _activePort = 5050;
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("FATAL: Could not bind HTTP listener to Port 5050: " + ex.Message);
                    Console.ResetColor();
                    return;
                }
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("=========================================================================");
            Console.WriteLine(" [READY] Smart Card Bridge is ACTIVE & LISTENING on Port " + _activePort);
            Console.WriteLine(" - REST API: http://localhost:5050/api/operation/ReadCard");
            Console.WriteLine(" - Diagnostics: http://localhost:5050/");
            Console.WriteLine(" - Health Check: http://localhost:5050/status");
            Console.WriteLine("=========================================================================");
            Console.ResetColor();
            Console.WriteLine();

            while (true)
            {
                try
                {
                    var context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch (Exception ex)
                {
                    if (!_listener.IsListening) break;
                    Console.WriteLine("Listener exception: " + ex.Message);
                }
            }
        }

        private static void ProcessRequest(object state)
        {
            var context = (HttpListenerContext)state;
            var req = context.Request;
            var resp = context.Response;

            // Modern CORS & Private Network Access Headers
            resp.AddHeader("Access-Control-Allow-Origin", "*");
            resp.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            resp.AddHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With, Authorization, Access-Control-Request-Private-Network");
            resp.AddHeader("Access-Control-Allow-Private-Network", "true");

            if (req.HttpMethod == "OPTIONS")
            {
                resp.StatusCode = 200;
                resp.Close();
                return;
            }

            string path = req.Url.AbsolutePath.ToLower().TrimEnd('/');
            string responseBody = "";
            string contentType = "application/json; charset=utf-8";

            try
            {
                if (string.IsNullOrEmpty(path) || path == "/index.html" || path == "/diagnostics")
                {
                    // Serve Diagnostic Dashboard
                    contentType = "text/html; charset=utf-8";
                    responseBody = GenerateDiagnosticHtml();
                }
                else if (path.Contains("status") || path.Contains("health"))
                {
                    bool cardIn = false;
                    string reader = "";
                    string atr = "";
                    lock (_lock)
                    {
                        if (_cardManager != null)
                        {
                            try { _cardManager.InitializesSCReaderLibrary(); } catch { }
                            reader = _cardManager.SelectedReaderName ?? "";
                            cardIn = _cardManager.IsCardInserted;
                            atr = _cardManager.DetectedATR ?? "";
                        }
                    }

                    responseBody = "{" +
                        "\"status\":\"ONLINE\"," +
                        "\"service\":\"Al Rabeesh Bahrain Smart Card Bridge\"," +
                        "\"version\":\"2026.1\"," +
                        "\"reader\":\"" + EscapeJson(reader) + "\"," +
                        "\"cardInserted\":" + (cardIn ? "true" : "false") + "," +
                        "\"atr\":\"" + EscapeJson(atr) + "\"" +
                        "}";
                }
                else if (path.Contains("getcardreaderlist"))
                {
                    string reader = "";
                    lock (_lock)
                    {
                        if (_cardManager != null)
                        {
                            try { _cardManager.InitializesSCReaderLibrary(); } catch { }
                            reader = _cardManager.SelectedReaderName ?? "";
                        }
                    }
                    if (string.IsNullOrEmpty(reader))
                    {
                        responseBody = "[]";
                    }
                    else
                    {
                        responseBody = "[\"" + EscapeJson(reader) + "\"]";
                    }
                }
                else
                {
                    // Handle ReadCard (POST / GET)
                    responseBody = PerformCardRead();
                }

                byte[] buffer = Encoding.UTF8.GetBytes(responseBody);
                resp.ContentType = contentType;
                resp.ContentLength64 = buffer.Length;
                resp.StatusCode = 200;
                resp.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Request error: " + ex.Message);
                Console.ResetColor();

                string errJson = "{\"ErrorDescription\":\"" + EscapeJson(ex.Message) + "\",\"Success\":false}";
                byte[] errBuffer = Encoding.UTF8.GetBytes(errJson);
                resp.ContentType = "application/json; charset=utf-8";
                resp.StatusCode = 200;
                resp.OutputStream.Write(errBuffer, 0, errBuffer.Length);
            }
            finally
            {
                try { resp.OutputStream.Close(); } catch { }
            }
        }

        private static string PerformCardRead()
        {
            lock (_lock)
            {
                try
                {
                    if (_cardManager == null)
                    {
                        InitializeCardManager();
                    }

                    // Refresh reader connection
                    _cardManager.InitializesSCReaderLibrary();

                    string activeReader = _cardManager.SelectedReaderName;
                    if (string.IsNullOrEmpty(activeReader))
                    {
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] Read failed: No USB smart card reader detected.");
                        Console.ResetColor();
                        return "{\"ErrorDescription\":\"No smart card reader detected. Please plug in the USB Smart Card Reader.\",\"Success\":false}";
                    }

                    _cardManager.ToIncludePersonalInfo = true;
                    _cardManager.ToIncludeAddressInfo = true;
                    _cardManager.ToIncludeEmploymentInfo = true;
                    _cardManager.ToIncludePassportInfo = true;
                    _cardManager.ToIncludePhoto = true;
                    _cardManager.ToIncludeSignature = true;
                    _cardManager.ToIncludeBiometricSupportInfo = true;

                    bool readSuccess = _cardManager.ReadInsertedCardFromReader(activeReader);
                    if (!readSuccess)
                    {
                        readSuccess = _cardManager.ReadCard();
                    }

                    SmartcardData data = _cardManager.SmartcardData;

                    if (!readSuccess || data == null)
                    {
                        string errMsg = (data != null && !string.IsNullOrEmpty(data.ErrorDescription)) 
                            ? data.ErrorDescription 
                            : "The smart card has been removed, so further communication is not possible.";

                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] Read failed in reader (" + activeReader + "): " + errMsg);
                        Console.ResetColor();
                        return "{\"ErrorDescription\":\"" + EscapeJson(errMsg) + "\",\"Success\":false,\"ReaderName\":\"" + EscapeJson(activeReader) + "\"}";
                    }

                    string atr = _cardManager.DetectedATR ?? "";
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] Card read successful! ATR: " + atr);
                    Console.ResetColor();

                    string cpr = data.IdNumber ?? "";
                    string fullNameEn = data.EnglishFullName ?? "";
                    string fullNameAr = data.ArabicFullName ?? "";
                    string birthDate = data.BirthDate ?? "";
                    string expiryDate = data.CardexpiryDate ?? "";
                    string issueDate = data.CardIssueDate ?? "";
                    string gender = data.Gender ?? "";
                    string nationality = data.NationalityCode ?? "Bahraini";
                    string bloodGroup = "";
                    string phone = "";
                    string flat = data.FlatNo ?? "";
                    string bldg = data.BuildingNo ?? "";
                    string road = data.RoadNo ?? "";
                    string roadName = data.RoadNameEnglish ?? "";
                    string block = data.BlockNo ?? "";
                    string blockName = data.BlockNameEnglish ?? "";
                    string address = data.AddressEnglish ?? "";
                    string photoBase64 = data.PhotoB64Encoded ?? "";
                    if (string.IsNullOrEmpty(photoBase64) && data.Photo != null && data.Photo.Length > 0)
                    {
                        photoBase64 = Convert.ToBase64String(data.Photo);
                    }

                    if (data.MiscellaneousTextData != null)
                    {
                        if (string.IsNullOrEmpty(cpr) && data.MiscellaneousTextData.ContainsKey("CPRNO"))
                            cpr = data.MiscellaneousTextData["CPRNO"];

                        if (string.IsNullOrEmpty(phone) && data.MiscellaneousTextData.ContainsKey("ContactNo"))
                            phone = data.MiscellaneousTextData["ContactNo"];

                        if (string.IsNullOrEmpty(phone) && data.MiscellaneousTextData.ContainsKey("ResidenceNo"))
                            phone = data.MiscellaneousTextData["ResidenceNo"];

                        if (data.MiscellaneousTextData.ContainsKey("BloodGroup"))
                            bloodGroup = data.MiscellaneousTextData["BloodGroup"];

                        if (string.IsNullOrEmpty(flat) && data.MiscellaneousTextData.ContainsKey("FlatNo"))
                            flat = data.MiscellaneousTextData["FlatNo"];

                        if (string.IsNullOrEmpty(bldg) && data.MiscellaneousTextData.ContainsKey("BuildingNo"))
                            bldg = data.MiscellaneousTextData["BuildingNo"];

                        if (string.IsNullOrEmpty(road) && data.MiscellaneousTextData.ContainsKey("RoadNo"))
                            road = data.MiscellaneousTextData["RoadNo"];

                        if (string.IsNullOrEmpty(roadName) && data.MiscellaneousTextData.ContainsKey("RoadName"))
                            roadName = data.MiscellaneousTextData["RoadName"];

                        if (string.IsNullOrEmpty(block) && data.MiscellaneousTextData.ContainsKey("BlockNo"))
                            block = data.MiscellaneousTextData["BlockNo"];

                        if (string.IsNullOrEmpty(blockName) && data.MiscellaneousTextData.ContainsKey("BlockName"))
                            blockName = data.MiscellaneousTextData["BlockName"];

                        if (string.IsNullOrEmpty(gender) && data.MiscellaneousTextData.ContainsKey("Gender"))
                            gender = data.MiscellaneousTextData["Gender"];

                        if (string.IsNullOrEmpty(birthDate) && data.MiscellaneousTextData.ContainsKey("DateOfBirth"))
                            birthDate = data.MiscellaneousTextData["DateOfBirth"];
                    }

                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine(">>> SUCCESS! Scanned Patient: " + fullNameEn + " (CPR: " + cpr + ", Phone: " + phone + ") <<<");
                    Console.ResetColor();

                    var sb = new StringBuilder();
                    sb.Append("{");
                    sb.Append("\"Success\":true,");
                    sb.Append("\"CPR\":\"").Append(EscapeJson(cpr)).Append("\",");
                    sb.Append("\"IdNumber\":\"").Append(EscapeJson(cpr)).Append("\",");
                    sb.Append("\"EnglishFullName\":\"").Append(EscapeJson(fullNameEn)).Append("\",");
                    sb.Append("\"ArabicFullName\":\"").Append(EscapeJson(fullNameAr)).Append("\",");
                    sb.Append("\"BirthDate\":\"").Append(EscapeJson(birthDate)).Append("\",");
                    sb.Append("\"CardexpiryDate\":\"").Append(EscapeJson(expiryDate)).Append("\",");
                    sb.Append("\"CardIssueDate\":\"").Append(EscapeJson(issueDate)).Append("\",");
                    sb.Append("\"CardCountry\":\"BAH\",");
                    sb.Append("\"Gender\":\"").Append(EscapeJson(gender)).Append("\",");
                    sb.Append("\"NationalityCode\":\"").Append(EscapeJson(nationality)).Append("\",");
                    sb.Append("\"AddressEnglish\":\"").Append(EscapeJson(address)).Append("\",");
                    sb.Append("\"FlatNo\":\"").Append(EscapeJson(flat)).Append("\",");
                    sb.Append("\"BuildingNo\":\"").Append(EscapeJson(bldg)).Append("\",");
                    sb.Append("\"RoadNo\":\"").Append(EscapeJson(road)).Append("\",");
                    sb.Append("\"RoadNameEnglish\":\"").Append(EscapeJson(roadName)).Append("\",");
                    sb.Append("\"BlockNo\":\"").Append(EscapeJson(block)).Append("\",");
                    sb.Append("\"BlockNameEnglish\":\"").Append(EscapeJson(blockName)).Append("\",");
                    sb.Append("\"CardPhoto\":\"").Append(photoBase64).Append("\",");
                    sb.Append("\"CPRPhoto\":\"").Append(photoBase64).Append("\",");
                    sb.Append("\"PhotoB64Encoded\":\"").Append(photoBase64).Append("\",");
                    sb.Append("\"Photo\":\"").Append(photoBase64).Append("\",");
                    sb.Append("\"ErrorDescription\":null,");
                    sb.Append("\"MiscellaneousTextData\":{");
                    sb.Append("\"CPRNO\":\"").Append(EscapeJson(cpr)).Append("\",");
                    sb.Append("\"ContactNo\":\"").Append(EscapeJson(phone)).Append("\",");
                    sb.Append("\"FirstNameEnglish\":\"").Append(EscapeJson(data.EnglishFirstName ?? "")).Append("\",");
                    sb.Append("\"LastNameEnglish\":\"").Append(EscapeJson(data.EnglishLastName ?? "")).Append("\",");
                    sb.Append("\"BloodGroup\":\"").Append(EscapeJson(bloodGroup)).Append("\",");
                    sb.Append("\"Gender\":\"").Append(EscapeJson(gender)).Append("\",");
                    sb.Append("\"FlatNo\":\"").Append(EscapeJson(flat)).Append("\",");
                    sb.Append("\"BuildingNo\":\"").Append(EscapeJson(bldg)).Append("\",");
                    sb.Append("\"RoadNo\":\"").Append(EscapeJson(road)).Append("\",");
                    sb.Append("\"RoadName\":\"").Append(EscapeJson(roadName)).Append("\",");
                    sb.Append("\"BlockNo\":\"").Append(EscapeJson(block)).Append("\",");
                    sb.Append("\"BlockName\":\"").Append(EscapeJson(blockName)).Append("\"");
                    sb.Append("}");
                    sb.Append("}");

                    return sb.ToString();
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine("Card read error: " + ex.Message);
                    Console.ResetColor();

                    try { InitializeCardManager(); } catch { }
                    return "{\"ErrorDescription\":\"" + EscapeJson(ex.Message) + "\",\"Success\":false}";
                }
            }
        }

        private static string GenerateDiagnosticHtml()
        {
            string reader = "";
            bool cardIn = false;
            string atr = "";
            lock (_lock)
            {
                if (_cardManager != null)
                {
                    try { _cardManager.InitializesSCReaderLibrary(); } catch { }
                    reader = _cardManager.SelectedReaderName ?? "";
                    cardIn = _cardManager.IsCardInserted;
                    atr = _cardManager.DetectedATR ?? "";
                }
            }

            return @"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Al Rabeesh Dental — Bahrain Smart Card Bridge</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
        .container { max-width: 820px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
        .header-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 16px; }
        .logo-box { background: #ffffff; padding: 6px 14px; border-radius: 12px; display: inline-flex; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.25); cursor: pointer; transition: transform 0.2s; }
        .logo-box:hover { transform: translateY(-1px); }
        .logo-box img { height: 38px; object-fit: contain; }
        h1 { color: #38bdf8; margin: 0; display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 800; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
        .badge-green { background: #059669; color: #ecfdf5; }
        .badge-yellow { background: #d97706; color: #fffbeb; }
        .badge-red { background: #dc2626; color: #fef2f2; }
        .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
        .card { background: #0f172a; padding: 16px; border-radius: 10px; border: 1px solid #334155; }
        .card-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; letter-spacing: 0.5px; }
        .card-val { font-size: 15px; font-weight: 600; color: #f1f5f9; word-break: break-all; }
        button.btn-primary { background: linear-gradient(135deg, #0284c7, #0369a1); color: white; border: none; padding: 12px 24px; font-size: 15px; font-weight: bold; border-radius: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3); }
        button.btn-primary:hover { background: linear-gradient(135deg, #0369a1, #075985); }
        button.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        #output { margin-top: 20px; background: #020617; border-radius: 10px; padding: 16px; border: 1px solid #1e293b; font-family: Consolas, Monaco, monospace; font-size: 13px; max-height: 320px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; color: #38bdf8; }
        .note { font-size: 13px; color: #94a3b8; margin-top: 16px; line-height: 1.5; background: #0f172a; padding: 14px; border-radius: 10px; border-left: 4px solid #38bdf8; }
        .note strong { color: #38bdf8; }
        
        /* Footer matching Application */
        .footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #94a3b8; }
        .btn-sands { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; background: #0f172a; border: 1px solid #334155; color: #e2e8f0; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; }
        .btn-sands:hover { background: #1e1b4b; border-color: #818cf8; transform: translateY(-1px); }
        .grad-sands { background: linear-gradient(135deg, #c026d3, #9333ea, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; }

        /* Sands Modal */
        .modal-overlay { position: fixed; inset: 0; z-index: 9999; display: none; align-items: center; justify-content: center; padding: 16px; background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(6px); }
        .modal-overlay.active { display: flex; }
        .modal-card { width: 100%; max-width: 480px; background: #1e293b; color: #f8fafc; border-radius: 20px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); border: 1px solid #334155; overflow: hidden; position: relative; }
        .modal-close { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.3); border: none; color: white; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 20; }
        .modal-head { padding: 24px 20px; background: linear-gradient(135deg, #c026d3 0%, #9333ea 50%, #4f46e5 100%); text-align: center; }
        .modal-head h3 { font-size: 19px; font-weight: 800; margin: 8px 0 2px; }
        .modal-head p { font-size: 12px; color: #f3e8ff; margin: 0; }
        .modal-body { padding: 20px; font-size: 13px; line-height: 1.6; }
        .modal-info-box { background: #0f172a; border-radius: 12px; padding: 14px; margin: 14px 0; border: 1px solid #334155; display: flex; flex-direction: column; gap: 8px; }
        .info-item { display: flex; gap: 6px; flex-wrap: wrap; }
        .info-item a { color: #38bdf8; text-decoration: none; font-weight: 600; }
        .modal-acts { display: flex; gap: 8px; margin-top: 16px; }
        .btn-wa { flex: 1; padding: 9px 12px; background: #10b981; color: white; border-radius: 10px; font-weight: bold; text-decoration: none; text-align: center; font-size: 12px; }
        .btn-prod { flex: 1; padding: 9px 12px; background: #0f172a; color: #38bdf8; border: 1px solid #38bdf8; border-radius: 10px; font-weight: bold; text-decoration: none; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header-top"">
            <!-- SaNDS Lab White Container Logo -->
            <div class=""logo-box"" onclick=""openSandsModal()"" title=""Engineered by SaNDS Lab"">
                <img src=""https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png"" alt=""SaNDS Lab"" onerror=""this.style.display='none'"" />
            </div>
            <div style=""font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #0f172a; padding: 6px 12px; border-radius: 8px; border: 1px solid #334155;"">
                Port 5050 &bull; REST API
            </div>
        </div>

        <h1>🏥 Al Rabeesh Dental — Bahrain Smart Card Bridge</h1>
        <p style=""color: #94a3b8; margin-top: 4px; font-size: 13px;"">Official CIO CPR Card Reader Service Bridge</p>

        <div class=""status-grid"">
            <div class=""card"">
                <div class=""card-label"">Bridge Service Status</div>
                <div class=""card-val""><span class=""badge badge-green"">● ACTIVE (Port 5050)</span></div>
            </div>
            <div class=""card"">
                <div class=""card-label"">USB Smart Card Reader</div>
                <div class=""card-val"">" + (string.IsNullOrEmpty(reader) ? "<span class=\"badge badge-red\">Not Detected</span>" : "<span class=\"badge badge-green\">" + EscapeJson(reader) + "</span>") + @"</div>
            </div>
            <div class=""card"">
                <div class=""card-label"">CPR Card Insertion</div>
                <div class=""card-val"">" + (cardIn ? "<span class=\"badge badge-green\">Card Inserted</span>" : "<span class=\"badge badge-yellow\">No Card in Reader</span>") + @"</div>
            </div>
            <div class=""card"">
                <div class=""card-label"">Detected Card ATR</div>
                <div class=""card-val"">" + (string.IsNullOrEmpty(atr) ? "<span style=\"color:#64748b\">—</span>" : atr) + @"</div>
            </div>
        </div>

        <div style=""display: flex; gap: 12px; align-items: center;"">
            <button id=""btnRead"" class=""btn-primary"" onclick=""testReadCard()"">💳 Read CPR Smart Card Now</button>
            <button onclick=""location.reload()"" style=""background: #334155; color: white; border: none; padding: 12px 18px; font-size: 14px; font-weight: bold; border-radius: 10px; cursor: pointer;"">🔄 Refresh Status</button>
        </div>

        <div id=""output"">Click 'Read CPR Smart Card Now' to test live card reading...</div>

        <div class=""note"">
            <strong>How to use with CPR Card:</strong><br>
            1. Insert CPR Card firmly into USB reader (Chip facing UP for old cards, or DOWN for 2025/2026 back-chip cards).<br>
            2. Click the button above to verify CPR Number, Name, Address, and Date of Birth.<br>
            3. In Al Rabeesh Dental App, click 'Read CPR' — it reads automatically via Port 5050!
        </div>

        <!-- Footer Matching Application -->
        <footer class=""footer"">
            <div>
                <span>Al Rabeesh Dental Software &bull; Bahrain Smart Card Active</span>
            </div>
            <div>
                <button type=""button"" class=""btn-sands"" onclick=""openSandsModal()"">
                    <span>✨ Engineered By</span>
                    <span class=""grad-sands"">SaNDS Lab</span>
                </button>
            </div>
        </footer>
    </div>

    <!-- SaNDS Lab Modal Popup (Matching Application) -->
    <div id=""sandsModal"" class=""modal-overlay"" onclick=""closeSandsModal(event)"">
        <div class=""modal-card"" onclick=""event.stopPropagation()"">
            <button class=""modal-close"" onclick=""closeSandsModal()"">&times;</button>
            <div class=""modal-head"">
                <div class=""logo-box"" style=""display: inline-flex; margin-bottom: 6px;"">
                    <img src=""https://qrgenerator.sandslab.com/assets/SaNDSLab-LogoForWhite-C43CoLgA.png"" alt=""SaNDS Lab"" style=""height: 36px;"" />
                </div>
                <h3>SaNDS Lab Middle East W.L.L</h3>
                <p>✨ Enterprise AI & Smart Automation Systems</p>
            </div>
            <div class=""modal-body"">
                <p style=""text-align: center; color: #cbd5e1; margin-bottom: 12px;"">
                    Engineers turnkey software solutions for healthcare networks, commercial real-estate towers, and government bodies across Bahrain and the GCC.
                </p>
                <div class=""modal-info-box"">
                    <div class=""info-item""><span>📍</span><strong>Regional HQ:</strong> <span>Manama, Kingdom of Bahrain</span></div>
                    <div class=""info-item""><span>💬</span><strong>WhatsApp / Tel:</strong> <a href=""https://wa.me/97335078079"" target=""_blank"" style=""color: #34d399;"">+973 35078079</a></div>
                    <div class=""info-item""><span>✉️</span><strong>Official Email:</strong> <a href=""mailto:info@sandslab.com"">info@sandslab.com</a></div>
                    <div class=""info-item""><span>🌐</span><strong>Website:</strong> <a href=""https://www.sandslab.com"" target=""_blank"">https://sandslab.com &nearr;</a></div>
                    <div class=""info-item""><span>🛍️</span><strong>Product Catalog:</strong> <a href=""https://sandslab.com/products/"" target=""_blank"" style=""color: #f472b6;"">https://sandslab.com/products/ &nearr;</a></div>
                </div>
                <div class=""modal-acts"">
                    <a href=""https://wa.me/97335078079"" target=""_blank"" class=""btn-wa"">💬 Chat on WhatsApp</a>
                    <a href=""https://sandslab.com/products/"" target=""_blank"" class=""btn-prod"">🛍️ Latest Products &nearr;</a>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function testReadCard() {
            const out = document.getElementById('output');
            const btn = document.getElementById('btnRead');
            btn.disabled = true;
            btn.innerText = 'Reading Smart Card...';
            out.innerText = 'Communicating with USB Smart Card Reader via Port 5050...';

            try {
                const res = await fetch('/api/operation/ReadCard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ReadCardInfo: true, ReadPersonalInfo: true, ReadAddressDetails: true })
                });
                const data = await res.json();
                out.innerText = JSON.stringify(data, null, 2);
            } catch (err) {
                out.innerText = 'Error connecting to bridge: ' + err.message;
            } finally {
                btn.disabled = false;
                btn.innerText = '💳 Read CPR Smart Card Now';
            }
        }

        function openSandsModal() {
            document.getElementById('sandsModal').classList.add('active');
        }
        function closeSandsModal(e) {
            if (e && e.target !== e.currentTarget && !e.target.classList.contains('modal-close')) return;
            document.getElementById('sandsModal').classList.remove('active');
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') document.getElementById('sandsModal').classList.remove('active');
        });
    </script>
</body>
</html>";
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ").Trim();
        }
    }
}
