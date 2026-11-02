-- ============================================================
-- 05_procedures.sql  —  Stored Procedures & Functions  (ADVANCED FEATURE #3)
-- Run AFTER 04_triggers.sql
-- ============================================================
USE MultiHospitalHealthcare;

DROP PROCEDURE IF EXISTS sp_book_appointment;
DROP PROCEDURE IF EXISTS sp_discharge_patient;
DROP FUNCTION  IF EXISTS fn_patient_age;
DROP FUNCTION  IF EXISTS fn_outstanding_balance;

DELIMITER $$

-- FUNCTION: age of a patient in years
CREATE FUNCTION fn_patient_age(p_patient_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_dob DATE;
    SELECT Date_of_Birth INTO v_dob FROM Patient WHERE Patient_ID = p_patient_id;
    RETURN TIMESTAMPDIFF(YEAR, v_dob, CURDATE());
END$$

-- FUNCTION: total outstanding (Pending) balance for a patient
CREATE FUNCTION fn_outstanding_balance(p_patient_id INT)
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12,2);
    SELECT COALESCE(SUM(Amount),0) INTO v_total
    FROM Payment
    WHERE Patient_ID = p_patient_id AND Payment_Status = 'Pending';
    RETURN v_total;
END$$

-- PROCEDURE: book an appointment with basic validation
CREATE PROCEDURE sp_book_appointment(
    IN  p_patient_id INT,
    IN  p_doctor_id  INT,
    IN  p_datetime   DATETIME,
    IN  p_reason     VARCHAR(255),
    OUT p_new_id     INT
)
BEGIN
    IF p_datetime < NOW() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot book an appointment in the past';
    END IF;

    INSERT INTO Appointment (Patient_ID, Doctor_ID, Appointment_DateTime, Appointment_Status, Reason)
    VALUES (p_patient_id, p_doctor_id, p_datetime, 'Scheduled', p_reason);

    SET p_new_id = LAST_INSERT_ID();
END$$

-- PROCEDURE: discharge a patient (trigger frees the bed)
CREATE PROCEDURE sp_discharge_patient(
    IN p_admission_id INT,
    IN p_discharge    DATETIME
)
BEGIN
    UPDATE Admission
    SET Admission_Status = 'Discharged',
        Discharge_Date   = p_discharge
    WHERE Admission_ID = p_admission_id
      AND Admission_Status = 'Admitted';
END$$

DELIMITER ;

-- ---- demos ----
SELECT Patient_Name, fn_patient_age(Patient_ID) AS Age FROM Patient;
SELECT fn_outstanding_balance(2) AS Priya_Outstanding;

CALL sp_book_appointment(3, 3, '2026-12-01 10:00:00', 'Routine checkup', @new_id);
SELECT @new_id AS New_Appointment_ID;
