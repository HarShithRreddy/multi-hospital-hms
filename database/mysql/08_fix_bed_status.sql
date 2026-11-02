-- ============================================================
-- 08_fix_bed_status.sql — one-off data repair (safe to re-run)
-- The original seed admitted Priya (Admission 1) to bed A-201 before the
-- triggers existed, so that bed stayed 'Available'. This marks every bed
-- that has an active admission as 'Occupied'.
-- ============================================================
USE MultiHospitalHealthcare;

UPDATE Bed b
JOIN Admission a ON a.Bed_ID = b.Bed_ID AND a.Admission_Status = 'Admitted'
SET b.Status = 'Occupied';

SELECT b.Bed_Number, b.Status, p.Patient_Name
FROM Bed b
LEFT JOIN Admission a ON a.Bed_ID = b.Bed_ID AND a.Admission_Status = 'Admitted'
LEFT JOIN Patient p ON p.Patient_ID = a.Patient_ID
ORDER BY b.Bed_ID;
