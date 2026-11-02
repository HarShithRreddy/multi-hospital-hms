-- ============================================================
-- 04_triggers.sql  —  Triggers  (ADVANCED FEATURE #2)
-- Run AFTER 02_seed.sql
-- ============================================================
USE MultiHospitalHealthcare;

DROP TRIGGER IF EXISTS trg_after_admission_insert;
DROP TRIGGER IF EXISTS trg_after_admission_update;
DROP TRIGGER IF EXISTS trg_before_prescmed_insert;

DELIMITER $$

-- 1. When a patient is admitted, mark their bed Occupied automatically.
CREATE TRIGGER trg_after_admission_insert
AFTER INSERT ON Admission
FOR EACH ROW
BEGIN
    UPDATE Bed
    SET Status = 'Occupied'
    WHERE Bed_ID = NEW.Bed_ID;
END$$

-- 2. When an admission is marked Discharged/Transferred, free the bed.
CREATE TRIGGER trg_after_admission_update
AFTER UPDATE ON Admission
FOR EACH ROW
BEGIN
    IF NEW.Admission_Status IN ('Discharged','Transferred')
       AND OLD.Admission_Status = 'Admitted' THEN
        UPDATE Bed
        SET Status = 'Available'
        WHERE Bed_ID = NEW.Bed_ID;
    END IF;
END$$

-- 3. Before adding a medicine to a prescription, block it if stock is
--    insufficient, otherwise decrement stock. Demonstrates SIGNAL.
CREATE TRIGGER trg_before_prescmed_insert
BEFORE INSERT ON Prescription_Medicine
FOR EACH ROW
BEGIN
    DECLARE available INT;
    SELECT Stock_Quantity INTO available
    FROM Medicine WHERE Medicine_ID = NEW.Medicine_ID;

    IF available < NEW.Duration_Days THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient medicine stock for this prescription';
    ELSE
        UPDATE Medicine
        SET Stock_Quantity = Stock_Quantity - NEW.Duration_Days
        WHERE Medicine_ID = NEW.Medicine_ID;
    END IF;
END$$

DELIMITER ;

-- ---- demo: admit a patient and watch the bed flip to Occupied ----
-- Bed 4 is Available before:
SELECT Bed_ID, Status FROM Bed WHERE Bed_ID = 4;
INSERT INTO Admission (Patient_ID, Bed_ID, Admitting_Doctor_ID, Admission_Date, Diagnosis, Admission_Status)
VALUES (3, 4, 3, '2026-10-27 09:00:00', 'Observation', 'Admitted');
-- Bed 4 should now be Occupied:
SELECT Bed_ID, Status FROM Bed WHERE Bed_ID = 4;

-- discharge it -> bed frees again
UPDATE Admission SET Admission_Status='Discharged', Discharge_Date='2026-10-27 18:00:00'
WHERE Bed_ID = 4 AND Admission_Status='Admitted';
SELECT Bed_ID, Status FROM Bed WHERE Bed_ID = 4;
