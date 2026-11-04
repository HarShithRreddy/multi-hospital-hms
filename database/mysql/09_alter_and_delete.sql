-- ============================================================
-- 09_alter_and_delete.sql  —  ALTER (DDL) and DELETE (DML) demonstrations
-- Run once, AFTER 01–05. Safe for the app: it only adds columns/indexes
-- and deletes rows it creates itself.
-- ============================================================
USE MultiHospitalHealthcare;

-- ------------------------------------------------------------
-- PART A — ALTER TABLE: evolving the schema after creation
-- ------------------------------------------------------------

-- A1. Add a column with a default (existing rows get the default)
ALTER TABLE Doctor
    ADD COLUMN Consultation_Fee DECIMAL(8,2) NOT NULL DEFAULT 500.00;

-- A2. Add a CHECK constraint to an existing table
ALTER TABLE Doctor
    ADD CONSTRAINT CHK_Doctor_Fee CHECK (Consultation_Fee >= 0);

-- A3. Add a column used for stock alerts, then an index on it
ALTER TABLE Medicine
    ADD COLUMN Reorder_Level INT NOT NULL DEFAULT 50;
ALTER TABLE Medicine
    ADD INDEX IDX_Medicine_Stock (Stock_Quantity);

-- A4. Widen an existing column (MODIFY changes its type/size)
ALTER TABLE Patient
    MODIFY Address VARCHAR(300);

-- A5. Index for filtering appointments by status
ALTER TABLE Appointment
    ADD INDEX IDX_Appointment_Status (Appointment_Status);

-- show the effect
DESCRIBE Doctor;
SELECT Doctor_Name, Consultation_Fee FROM Doctor;
SELECT Medicine_Name, Stock_Quantity, Reorder_Level,
       (Stock_Quantity <= Reorder_Level) AS Needs_Reorder
FROM Medicine;

-- ------------------------------------------------------------
-- PART B — UPDATE and DELETE, including ON DELETE CASCADE
-- ------------------------------------------------------------

-- B1. UPDATE: raise fees for senior doctors
UPDATE Doctor SET Consultation_Fee = 800.00 WHERE Experience_Years >= 12;
SELECT Doctor_Name, Experience_Years, Consultation_Fee FROM Doctor ORDER BY Experience_Years DESC;

-- B2. DELETE with CASCADE: create a temporary patient with an emergency
--     contact and an appointment, then delete the patient. The child rows
--     go too, because their foreign keys say ON DELETE CASCADE.
INSERT INTO Patient (Patient_Name, Date_of_Birth, Gender, Phone)
VALUES ('Temp Demo Patient', '2000-01-01', 'Other', '09999999990');
SET @tmp := LAST_INSERT_ID();
INSERT INTO Emergency_Contact (Patient_ID, Contact_Number) VALUES (@tmp, '09999999991');
INSERT INTO Appointment (Patient_ID, Doctor_ID, Appointment_DateTime, Appointment_Status, Reason)
VALUES (@tmp, 3, '2026-12-31 10:00:00', 'Scheduled', 'Demo');

SELECT 'before delete' AS stage,
       (SELECT COUNT(*) FROM Emergency_Contact WHERE Patient_ID = @tmp) AS contacts,
       (SELECT COUNT(*) FROM Appointment       WHERE Patient_ID = @tmp) AS appointments;

DELETE FROM Patient WHERE Patient_ID = @tmp;

SELECT 'after delete' AS stage,
       (SELECT COUNT(*) FROM Emergency_Contact WHERE Patient_ID = @tmp) AS contacts,
       (SELECT COUNT(*) FROM Appointment       WHERE Patient_ID = @tmp) AS appointments;

-- B3. DELETE with a condition: remove cancelled appointments older than a year
DELETE FROM Appointment
WHERE Appointment_Status = 'Cancelled'
  AND Appointment_DateTime < NOW() - INTERVAL 1 YEAR;

-- ------------------------------------------------------------
-- ON DELETE RESTRICT (try by hand in the viva — it is meant to fail):
--   DELETE FROM Doctor WHERE Doctor_ID = 5;
--   -> ERROR 1451 (23000): Cannot delete or update a parent row:
--      a foreign key constraint fails (... FK_Appointment_Doctor ...)
-- Doctors with history cannot be deleted, so no appointment is orphaned.
-- ------------------------------------------------------------
