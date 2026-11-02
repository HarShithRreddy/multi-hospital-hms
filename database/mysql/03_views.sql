-- ============================================================
-- 03_views.sql  —  Views  (ADVANCED FEATURE #1)
-- Run AFTER 02_seed.sql
-- ============================================================
USE MultiHospitalHealthcare;

DROP VIEW IF EXISTS vw_patient_appointments;
DROP VIEW IF EXISTS vw_bed_availability;
DROP VIEW IF EXISTS vw_patient_billing;
DROP VIEW IF EXISTS vw_admission_details;

-- 1. Patient appointments with doctor + department (multi-table join)
CREATE VIEW vw_patient_appointments AS
SELECT a.Appointment_ID,
       p.Patient_ID, p.Patient_Name,
       d.Doctor_ID, d.Doctor_Name, d.Specialization,
       dep.Department_Name,
       a.Appointment_DateTime, a.Appointment_Status, a.Reason
FROM Appointment a
JOIN Patient p   ON a.Patient_ID = p.Patient_ID
JOIN Doctor d    ON a.Doctor_ID  = d.Doctor_ID
JOIN Department dep ON d.Department_ID = dep.Department_ID;

-- 2. Live bed availability per hospital + department
CREATE VIEW vw_bed_availability AS
SELECT h.Hospital_Name, dep.Department_Name,
       b.Bed_ID, b.Bed_Number, b.Ward_Type, b.Status
FROM Bed b
JOIN Hospital h     ON b.Hospital_ID = h.Hospital_ID
JOIN Department dep ON b.Department_ID = dep.Department_ID;

-- 3. Per-patient billing summary (aggregation inside a view)
CREATE VIEW vw_patient_billing AS
SELECT p.Patient_ID, p.Patient_Name,
       COALESCE(SUM(CASE WHEN pay.Payment_Status = 'Paid'    THEN pay.Amount END),0) AS Total_Paid,
       COALESCE(SUM(CASE WHEN pay.Payment_Status = 'Pending' THEN pay.Amount END),0) AS Total_Pending,
       COUNT(pay.Payment_ID) AS Num_Payments
FROM Patient p
LEFT JOIN Payment pay ON p.Patient_ID = pay.Patient_ID
GROUP BY p.Patient_ID, p.Patient_Name;

-- 4. Admission details (patient + bed + doctor + hospital)
CREATE VIEW vw_admission_details AS
SELECT ad.Admission_ID, p.Patient_Name,
       b.Bed_Number, b.Ward_Type, h.Hospital_Name,
       d.Doctor_Name AS Admitting_Doctor,
       ad.Admission_Date, ad.Discharge_Date, ad.Admission_Status, ad.Diagnosis
FROM Admission ad
JOIN Patient p  ON ad.Patient_ID = p.Patient_ID
JOIN Bed b      ON ad.Bed_ID = b.Bed_ID
JOIN Hospital h ON b.Hospital_ID = h.Hospital_ID
JOIN Doctor d   ON ad.Admitting_Doctor_ID = d.Doctor_ID;

-- quick checks
SELECT * FROM vw_patient_appointments;
SELECT * FROM vw_bed_availability;
SELECT * FROM vw_patient_billing;
SELECT * FROM vw_admission_details;
