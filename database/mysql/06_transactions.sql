-- ============================================================
-- 06_transactions.sql  —  Transactions  (ADVANCED FEATURE #4, SQL side)
-- Demonstrates ACID: multiple writes succeed together or not at all.
-- Run AFTER 05_procedures.sql
-- ============================================================
USE MultiHospitalHealthcare;

-- ------------------------------------------------------------
-- EXAMPLE 1: Successful transaction — admit a patient AND record
-- the admission-fee payment atomically. Both commit together.
-- ------------------------------------------------------------
START TRANSACTION;

INSERT INTO Admission (Patient_ID, Bed_ID, Admitting_Doctor_ID, Admission_Date, Diagnosis, Admission_Status)
VALUES (5, 2, 1, '2026-10-27 12:00:00', 'Chest pain, admitted for observation', 'Admitted');

SET @adm := LAST_INSERT_ID();

INSERT INTO Payment (Patient_ID, Admission_ID, Insurance_ID, Amount, Payment_Date, Payment_Method, Payment_Status)
VALUES (5, @adm, NULL, 5000.00, NOW(), 'Card', 'Pending');

COMMIT;

SELECT 'After COMMIT:' AS note;
SELECT Admission_ID, Patient_ID, Admission_Status FROM Admission WHERE Admission_ID = @adm;
SELECT Bed_ID, Status FROM Bed WHERE Bed_ID = 2;   -- flipped to Occupied by trigger

-- ------------------------------------------------------------
-- EXAMPLE 2: ROLLBACK — simulate a failed multi-step operation.
-- We start recording a payment, then decide to cancel; ROLLBACK
-- undoes it so the database is left unchanged.
-- ------------------------------------------------------------
SELECT COUNT(*) AS payments_before FROM Payment;

START TRANSACTION;
INSERT INTO Payment (Patient_ID, Admission_ID, Insurance_ID, Amount, Payment_Date, Payment_Method, Payment_Status)
VALUES (1, NULL, 1, 9999.00, NOW(), 'Cash', 'Paid');
-- something went wrong (e.g. insurance validation failed) -> undo
ROLLBACK;

SELECT COUNT(*) AS payments_after_rollback FROM Payment;   -- unchanged

-- ------------------------------------------------------------
-- NOTE: In the Next.js app, the same pattern is used in
-- lib/mysql transactions (connection.beginTransaction /
-- commit / rollback) when booking + billing together.
-- ------------------------------------------------------------
