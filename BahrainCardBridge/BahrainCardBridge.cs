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

        static void Main(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("=========================================================================");
            Console.WriteLine(" Al Rabeesh Dental - Bahrain CPR Smart Card Bridge 2025");
            Console.WriteLine(" Supporting: Old Bahrain Cards (Front Chip) & New 2025 Cards (Back Chip)");
            Console.WriteLine("=========================================================================");
            Console.WriteLine();

            try
            {
                InitializeCardManager();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("CardManager init warning: " + ex.Message);
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
                Console.WriteLine("[SDK] Card Manager Initialized. Active Reader: " + (_cardManager.SelectedReaderName ?? "None"));
            }
        }

        private static void StartHttpServer()
        {
            int boundPort = 0;
            string[] prefixSets = new string[]
            {
                "http://localhost:5050/",
                "http://127.0.0.1:5050/"
            };

            try
            {
                _listener = new HttpListener();
                foreach (var p in prefixSets)
                {
                    _listener.Prefixes.Add(p);
                }
                _listener.Start();
                boundPort = 5050;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Could not bind to both prefixes: " + ex.Message);
                // Try localhost only
                try
                {
                    _listener = new HttpListener();
                    _listener.Prefixes.Add("http://localhost:5050/");
                    _listener.Start();
                    boundPort = 5050;
                }
                catch (Exception ex2)
                {
                    Console.WriteLine("Could not bind localhost:5050: " + ex2.Message);
                    try
                    {
                        _listener = new HttpListener();
                        _listener.Prefixes.Add("http://127.0.0.1:5050/");
                        _listener.Start();
                        boundPort = 5050;
                    }
                    catch (Exception ex3)
                    {
                        Console.WriteLine("Could not bind 127.0.0.1:5050: " + ex3.Message);
                    }
                }
            }

            if (boundPort == 0)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("FATAL: Could not bind HTTP listener to Port 5050.");
                Console.ResetColor();
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine(">>> Smart Card Bridge ACTIVE & Listening on HTTP Port " + boundPort + " <<<");
            Console.ResetColor();
            Console.WriteLine("Ready to read Bahrain Smart Cards for Al Rabeesh Dental Application.");
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

            // CORS headers
            resp.AddHeader("Access-Control-Allow-Origin", "*");
            resp.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            resp.AddHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With");

            if (req.HttpMethod == "OPTIONS")
            {
                resp.StatusCode = 200;
                resp.Close();
                return;
            }

            string path = req.Url.AbsolutePath.ToLower();
            string jsonResponse = "";

            try
            {
                if (path.Contains("status") || path.Contains("health"))
                {
                    jsonResponse = "{\"status\":\"ONLINE\",\"version\":\"2025.1\",\"reader\":\"" + (_cardManager != null ? _cardManager.SelectedReaderName : "") + "\"}";
                }
                else
                {
                    // Read Card
                    jsonResponse = PerformCardRead();
                }

                byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);
                resp.ContentType = "application/json; charset=utf-8";
                resp.ContentLength64 = buffer.Length;
                resp.StatusCode = 200;
                resp.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Error serving request: " + ex.Message);
                Console.ResetColor();

                string errJson = "{\"ErrorDescription\":\"" + EscapeJson(ex.Message) + "\"}";
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

                    // Refresh reader state
                    _cardManager.InitializesSCReaderLibrary();

                    if (!_cardManager.IsCardInserted)
                    {
                        Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] Read requested -> No card detected in reader slot.");
                        return "{\"ErrorDescription\":\"The smart card has been removed, so further communication is not possible.\"}";
                    }

                    Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] Card detected! ATR: " + _cardManager.DetectedATR);

                    _cardManager.ToIncludePersonalInfo = true;
                    _cardManager.ToIncludeAddressInfo = true;
                    _cardManager.ToIncludeEmploymentInfo = true;
                    _cardManager.ToIncludePassportInfo = true;

                    bool readSuccess = _cardManager.ReadCard();
                    SmartcardData data = _cardManager.SmartcardData;

                    if (!readSuccess || data == null)
                    {
                        return "{\"ErrorDescription\":\"Failed to read card data structure.\"}";
                    }

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
                    Console.WriteLine("SUCCESS! Scanned Patient: " + fullNameEn + " (CPR: " + cpr + ", Phone: " + phone + ")");
                    Console.ResetColor();

                    var sb = new StringBuilder();
                    sb.Append("{");
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
                    // Re-init on error
                    try { InitializeCardManager(); } catch { }
                    return "{\"ErrorDescription\":\"" + EscapeJson(ex.Message) + "\"}";
                }
            }
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ").Trim();
        }
    }
}
