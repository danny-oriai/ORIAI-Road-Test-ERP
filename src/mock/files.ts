import type { FileRecord } from "../types";

export const FILES: FileRecord[] = [
  { id: "F-100", name: "Aurora_Mobility_PO_2025-014.pdf",  category: "Project Contract", project: "PRJ-2025-014", related: "—",       link: "lark://drive/file/abc123", uploadedBy: "U001", uploadedTime: "2026-04-18", version: "v1.0" },
  { id: "F-101", name: "Test_Matrix_M11_corridor.xlsx",     category: "Test Plan",        project: "PRJ-2025-014", related: "—",       link: "lark://drive/file/abc124", uploadedBy: "U002", uploadedTime: "2026-04-19", version: "v2.1" },
  { id: "F-102", name: "Route_R-001_KML_export.kml",        category: "Route File",       project: "PRJ-2025-014", related: "R-001",   link: "lark://drive/file/abc125", uploadedBy: "U002", uploadedTime: "2026-04-20", version: "v1.0" },
  { id: "F-103", name: "Daily_Report_2026-05-06.pdf",       category: "Daily Report",     project: "PRJ-2025-014", related: "DT-2461", link: "lark://drive/file/abc126", uploadedBy: "U004", uploadedTime: "2026-05-06", version: "v1.0" },
  { id: "F-104", name: "ADAS_regression_logs.zip",          category: "Issue Report",     project: "PRJ-2025-011", related: "ISS-502", link: "lark://drive/file/abc127", uploadedBy: "U004", uploadedTime: "2026-05-04", version: "v1.0" },
  { id: "F-105", name: "Insurance_Cert_V-001.pdf",          category: "Vehicle Doc",      project: "—",            related: "V-001",   link: "lark://drive/file/abc128", uploadedBy: "U011", uploadedTime: "2026-01-12", version: "v1.0" },
  { id: "F-106", name: "Trade_Plate_TX1245_renewal.pdf",    category: "Plate Doc",        project: "—",            related: "TP-001",  link: "lark://drive/file/abc129", uploadedBy: "U001", uploadedTime: "2025-12-22", version: "v1.0" },
  { id: "F-107", name: "Voltaic_Drive_test_brief.docx",     category: "Client Brief",     project: "PRJ-2025-015", related: "—",       link: "lark://drive/file/abc130", uploadedBy: "U003", uploadedTime: "2026-04-30", version: "v1.2" },
  { id: "F-108", name: "ULEZ_Sweep_Plan.pdf",               category: "Test Plan",        project: "PRJ-2025-016", related: "—",       link: "lark://drive/file/abc131", uploadedBy: "U002", uploadedTime: "2026-05-02", version: "v0.9" },
];
