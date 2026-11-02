-- ============================================================
-- MULTI-HOSPITAL HEALTHCARE MANAGEMENT SYSTEM
-- 01_schema.sql  —  DDL (17 core tables + App_User auth table)
-- Engine: MySQL 8.0+ / MariaDB 10.4+
-- Team 16: PES2UG24CS187 Harshith Manish, PES2UG24CS188 Harshith R Reddy
-- ============================================================

DROP DATABASE IF EXISTS MultiHospitalHealthcare;
CREATE DATABASE MultiHospitalHealthcare;
USE MultiHospitalHealthcare;

-- ============================================================ HOSPITAL
CREATE TABLE Hospital (
    Hospital_ID INT PRIMARY KEY AUTO_INCREMENT,
    Hospital_Name VARCHAR(100) NOT NULL,
    Address VARCHAR(255) NOT NULL,
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Email VARCHAR(100) UNIQUE
);

-- ============================================================ DEPARTMENT
CREATE TABLE Department (
    Department_ID INT PRIMARY KEY AUTO_INCREMENT,
    Hospital_ID INT NOT NULL,
    Department_Name VARCHAR(100) NOT NULL,
    Location VARCHAR(100),
    CONSTRAINT FK_Department_Hospital FOREIGN KEY (Hospital_ID)
        REFERENCES Hospital(Hospital_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT UQ_Department_Hospital UNIQUE (Hospital_ID, Department_Name)
);

-- ============================================================ DOCTOR
CREATE TABLE Doctor (
    Doctor_ID INT PRIMARY KEY AUTO_INCREMENT,
    Department_ID INT NOT NULL,
    Doctor_Name VARCHAR(100) NOT NULL,
    Specialization VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) UNIQUE,
    Email VARCHAR(100) UNIQUE,
    License_No VARCHAR(50) UNIQUE NOT NULL,
    Experience_Years INT DEFAULT 0,
    CONSTRAINT CHK_Doctor_Experience CHECK (Experience_Years >= 0),
    CONSTRAINT FK_Doctor_Department FOREIGN KEY (Department_ID)
        REFERENCES Department(Department_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================ NURSE
CREATE TABLE Nurse (
    Nurse_ID INT PRIMARY KEY AUTO_INCREMENT,
    Department_ID INT NOT NULL,
    Nurse_Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(15) UNIQUE,
    Qualification VARCHAR(100),
    CONSTRAINT FK_Nurse_Department FOREIGN KEY (Department_ID)
        REFERENCES Department(Department_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================ STAFF
CREATE TABLE Staff (
    Staff_ID INT PRIMARY KEY AUTO_INCREMENT,
    Hospital_ID INT NOT NULL,
    Staff_Name VARCHAR(100) NOT NULL,
    Role VARCHAR(50) NOT NULL,
    Phone VARCHAR(15) UNIQUE,
    Email VARCHAR(100) UNIQUE,
    CONSTRAINT FK_Staff_Hospital FOREIGN KEY (Hospital_ID)
        REFERENCES Hospital(Hospital_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================ BED
CREATE TABLE Bed (
    Bed_ID INT PRIMARY KEY AUTO_INCREMENT,
    Hospital_ID INT NOT NULL,
    Department_ID INT NOT NULL,
    Bed_Number VARCHAR(20) NOT NULL,
    Ward_Type VARCHAR(50) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'Available',
    CONSTRAINT CHK_Bed_Status CHECK (Status IN ('Available','Occupied','Maintenance')),
    CONSTRAINT FK_Bed_Hospital FOREIGN KEY (Hospital_ID)
        REFERENCES Hospital(Hospital_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Bed_Department FOREIGN KEY (Department_ID)
        REFERENCES Department(Department_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT UQ_Bed_Hospital_Number UNIQUE (Hospital_ID, Bed_Number)
);

-- ============================================================ PATIENT
CREATE TABLE Patient (
    Patient_ID INT PRIMARY KEY AUTO_INCREMENT,
    Patient_Name VARCHAR(100) NOT NULL,
    Date_of_Birth DATE NOT NULL,
    Gender VARCHAR(20) NOT NULL,
    Blood_Group VARCHAR(5),
    Phone VARCHAR(15) UNIQUE NOT NULL,
    Email VARCHAR(100) UNIQUE,
    Address VARCHAR(255)
);

-- ============================================================ EMERGENCY_CONTACT (multivalued)
CREATE TABLE Emergency_Contact (
    Patient_ID INT NOT NULL,
    Contact_Number VARCHAR(15) NOT NULL,
    PRIMARY KEY (Patient_ID, Contact_Number),
    CONSTRAINT FK_EmergencyContact_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================ APPOINTMENT
CREATE TABLE Appointment (
    Appointment_ID INT PRIMARY KEY AUTO_INCREMENT,
    Patient_ID INT NOT NULL,
    Doctor_ID INT NOT NULL,
    Appointment_DateTime DATETIME NOT NULL,
    Appointment_Status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    Reason VARCHAR(255),
    CONSTRAINT CHK_Appointment_Status CHECK
        (Appointment_Status IN ('Scheduled','Completed','Cancelled','No-Show')),
    CONSTRAINT FK_Appointment_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Appointment_Doctor FOREIGN KEY (Doctor_ID)
        REFERENCES Doctor(Doctor_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================ ADMISSION
CREATE TABLE Admission (
    Admission_ID INT PRIMARY KEY AUTO_INCREMENT,
    Patient_ID INT NOT NULL,
    Bed_ID INT NOT NULL,
    Admitting_Doctor_ID INT NOT NULL,
    Admission_Date DATETIME NOT NULL,
    Discharge_Date DATETIME,
    Diagnosis VARCHAR(255),
    Admission_Status VARCHAR(20) NOT NULL DEFAULT 'Admitted',
    CONSTRAINT CHK_Admission_Status CHECK
        (Admission_Status IN ('Admitted','Discharged','Transferred')),
    CONSTRAINT CHK_Admission_Dates CHECK
        (Discharge_Date IS NULL OR Discharge_Date >= Admission_Date),
    CONSTRAINT FK_Admission_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Admission_Bed FOREIGN KEY (Bed_ID)
        REFERENCES Bed(Bed_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT FK_Admission_Doctor FOREIGN KEY (Admitting_Doctor_ID)
        REFERENCES Doctor(Doctor_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================ MEDICINE
CREATE TABLE Medicine (
    Medicine_ID INT PRIMARY KEY AUTO_INCREMENT,
    Medicine_Name VARCHAR(100) NOT NULL,
    Manufacturer VARCHAR(100),
    Unit_Price DECIMAL(10,2) NOT NULL,
    Stock_Quantity INT NOT NULL DEFAULT 0,
    CONSTRAINT CHK_Medicine_Price CHECK (Unit_Price >= 0),
    CONSTRAINT CHK_Medicine_Stock CHECK (Stock_Quantity >= 0)
);

-- ============================================================ PRESCRIPTION
CREATE TABLE Prescription (
    Prescription_ID INT PRIMARY KEY AUTO_INCREMENT,
    Patient_ID INT NOT NULL,
    Doctor_ID INT NOT NULL,
    Prescription_Date DATE NOT NULL,
    Notes VARCHAR(255),
    CONSTRAINT FK_Prescription_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Prescription_Doctor FOREIGN KEY (Doctor_ID)
        REFERENCES Doctor(Doctor_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================ PRESCRIPTION_MEDICINE (M:N)
CREATE TABLE Prescription_Medicine (
    Prescription_ID INT NOT NULL,
    Medicine_ID INT NOT NULL,
    Dosage VARCHAR(100) NOT NULL,
    Frequency VARCHAR(100) NOT NULL,
    Duration_Days INT NOT NULL,
    PRIMARY KEY (Prescription_ID, Medicine_ID),
    CONSTRAINT CHK_Prescription_Duration CHECK (Duration_Days > 0),
    CONSTRAINT FK_PM_Prescription FOREIGN KEY (Prescription_ID)
        REFERENCES Prescription(Prescription_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_PM_Medicine FOREIGN KEY (Medicine_ID)
        REFERENCES Medicine(Medicine_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================ LAB_TEST
CREATE TABLE Lab_Test (
    Test_ID INT PRIMARY KEY AUTO_INCREMENT,
    Patient_ID INT NOT NULL,
    Doctor_ID INT NOT NULL,
    Test_Name VARCHAR(100) NOT NULL,
    Test_Date DATETIME NOT NULL,
    Test_Status VARCHAR(20) NOT NULL DEFAULT 'Ordered',
    CONSTRAINT CHK_LabTest_Status CHECK (Test_Status IN ('Ordered','Completed','Cancelled')),
    CONSTRAINT FK_LabTest_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_LabTest_Doctor FOREIGN KEY (Doctor_ID)
        REFERENCES Doctor(Doctor_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================================ LAB_REPORT (1:1 with Lab_Test)
CREATE TABLE Lab_Report (
    Report_ID INT PRIMARY KEY AUTO_INCREMENT,
    Test_ID INT NOT NULL UNIQUE,
    Report_Date DATETIME NOT NULL,
    Result_Summary TEXT NOT NULL,
    Normal_Range VARCHAR(255),
    CONSTRAINT FK_LabReport_Test FOREIGN KEY (Test_ID)
        REFERENCES Lab_Test(Test_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================ INSURANCE
CREATE TABLE Insurance (
    Insurance_ID INT PRIMARY KEY AUTO_INCREMENT,
    Patient_ID INT NOT NULL,
    Provider_Name VARCHAR(100) NOT NULL,
    Policy_Number VARCHAR(100) UNIQUE NOT NULL,
    Coverage_Amount DECIMAL(12,2) NOT NULL,
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    CONSTRAINT CHK_Insurance_Coverage CHECK (Coverage_Amount >= 0),
    CONSTRAINT CHK_Insurance_Dates CHECK (End_Date >= Start_Date),
    CONSTRAINT FK_Insurance_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================ PAYMENT
CREATE TABLE Payment (
    Payment_ID INT PRIMARY KEY AUTO_INCREMENT,
    Patient_ID INT NOT NULL,
    Admission_ID INT,
    Insurance_ID INT,
    Amount DECIMAL(12,2) NOT NULL,
    Payment_Date DATETIME NOT NULL,
    Payment_Method VARCHAR(30) NOT NULL,
    Payment_Status VARCHAR(20) NOT NULL DEFAULT 'Paid',
    CONSTRAINT CHK_Payment_Amount CHECK (Amount >= 0),
    CONSTRAINT CHK_Payment_Status CHECK (Payment_Status IN ('Paid','Pending','Refunded')),
    CONSTRAINT FK_Payment_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_Payment_Admission FOREIGN KEY (Admission_ID)
        REFERENCES Admission(Admission_ID) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT FK_Payment_Insurance FOREIGN KEY (Insurance_ID)
        REFERENCES Insurance(Insurance_ID) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================ APP_USER  (authentication + RBAC)
-- NEW: supports login with bcrypt-hashed passwords and roles.
-- A user may be linked to a Patient row or a Doctor row (or neither, for Admin/Staff).
CREATE TABLE App_User (
    User_ID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password_Hash VARCHAR(255) NOT NULL,          -- bcrypt hash, never plaintext
    Role VARCHAR(20) NOT NULL,
    Patient_ID INT,
    Doctor_ID INT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CHK_User_Role CHECK (Role IN ('Admin','Doctor','Patient','Staff')),
    CONSTRAINT FK_User_Patient FOREIGN KEY (Patient_ID)
        REFERENCES Patient(Patient_ID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT FK_User_Doctor FOREIGN KEY (Doctor_ID)
        REFERENCES Doctor(Doctor_ID) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================ INDEXES
CREATE INDEX IDX_Appointment_Patient   ON Appointment(Patient_ID);
CREATE INDEX IDX_Appointment_Doctor    ON Appointment(Doctor_ID);
CREATE INDEX IDX_Appointment_DateTime  ON Appointment(Appointment_DateTime);
CREATE INDEX IDX_Admission_Patient     ON Admission(Patient_ID);
CREATE INDEX IDX_Admission_Status      ON Admission(Admission_Status);
CREATE INDEX IDX_LabTest_Patient       ON Lab_Test(Patient_ID);
CREATE INDEX IDX_Payment_Patient       ON Payment(Patient_ID);
CREATE INDEX IDX_User_Role             ON App_User(Role);
