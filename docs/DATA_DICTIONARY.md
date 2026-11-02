# Data Dictionary — Multi-Hospital Healthcare Management System

Team 16 · generated from the live schema (`INFORMATION_SCHEMA`). 18 base tables.

## Admission

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Admission_ID | int(11) | NO | PRI | - | auto_increment |
| Patient_ID | int(11) | NO | MUL | - | - |
| Bed_ID | int(11) | NO | MUL | - | - |
| Admitting_Doctor_ID | int(11) | NO | MUL | - | - |
| Admission_Date | datetime | NO | - | - | - |
| Discharge_Date | datetime | YES | - | NULL | - |
| Diagnosis | varchar(255) | YES | - | NULL | - |
| Admission_Status | varchar(20) | NO | MUL | 'Admitted' | - |

## Appointment

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Appointment_ID | int(11) | NO | PRI | - | auto_increment |
| Patient_ID | int(11) | NO | MUL | - | - |
| Doctor_ID | int(11) | NO | MUL | - | - |
| Appointment_DateTime | datetime | NO | MUL | - | - |
| Appointment_Status | varchar(20) | NO | - | 'Scheduled' | - |
| Reason | varchar(255) | YES | - | NULL | - |

## App_User

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| User_ID | int(11) | NO | PRI | - | auto_increment |
| Username | varchar(50) | NO | UNI | - | - |
| Password_Hash | varchar(255) | NO | - | - | - |
| Role | varchar(20) | NO | MUL | - | - |
| Patient_ID | int(11) | YES | MUL | NULL | - |
| Doctor_ID | int(11) | YES | MUL | NULL | - |
| Created_At | timestamp | YES | - | current_timestamp() | - |

## Bed

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Bed_ID | int(11) | NO | PRI | - | auto_increment |
| Hospital_ID | int(11) | NO | MUL | - | - |
| Department_ID | int(11) | NO | MUL | - | - |
| Bed_Number | varchar(20) | NO | - | - | - |
| Ward_Type | varchar(50) | NO | - | - | - |
| Status | varchar(20) | NO | - | 'Available' | - |

## Department

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Department_ID | int(11) | NO | PRI | - | auto_increment |
| Hospital_ID | int(11) | NO | MUL | - | - |
| Department_Name | varchar(100) | NO | - | - | - |
| Location | varchar(100) | YES | - | NULL | - |

## Doctor

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Doctor_ID | int(11) | NO | PRI | - | auto_increment |
| Department_ID | int(11) | NO | MUL | - | - |
| Doctor_Name | varchar(100) | NO | - | - | - |
| Specialization | varchar(100) | NO | - | - | - |
| Phone | varchar(15) | YES | UNI | NULL | - |
| Email | varchar(100) | YES | UNI | NULL | - |
| License_No | varchar(50) | NO | UNI | - | - |
| Experience_Years | int(11) | YES | - | 0 | - |

## Emergency_Contact

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Patient_ID | int(11) | NO | PRI | - | - |
| Contact_Number | varchar(15) | NO | PRI | - | - |

## Hospital

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Hospital_ID | int(11) | NO | PRI | - | auto_increment |
| Hospital_Name | varchar(100) | NO | - | - | - |
| Address | varchar(255) | NO | - | - | - |
| Phone | varchar(15) | NO | UNI | - | - |
| Email | varchar(100) | YES | UNI | NULL | - |

## Insurance

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Insurance_ID | int(11) | NO | PRI | - | auto_increment |
| Patient_ID | int(11) | NO | MUL | - | - |
| Provider_Name | varchar(100) | NO | - | - | - |
| Policy_Number | varchar(100) | NO | UNI | - | - |
| Coverage_Amount | decimal(12,2) | NO | - | - | - |
| Start_Date | date | NO | - | - | - |
| End_Date | date | NO | - | - | - |

## Lab_Report

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Report_ID | int(11) | NO | PRI | - | auto_increment |
| Test_ID | int(11) | NO | UNI | - | - |
| Report_Date | datetime | NO | - | - | - |
| Result_Summary | text | NO | - | - | - |
| Normal_Range | varchar(255) | YES | - | NULL | - |

## Lab_Test

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Test_ID | int(11) | NO | PRI | - | auto_increment |
| Patient_ID | int(11) | NO | MUL | - | - |
| Doctor_ID | int(11) | NO | MUL | - | - |
| Test_Name | varchar(100) | NO | - | - | - |
| Test_Date | datetime | NO | - | - | - |
| Test_Status | varchar(20) | NO | - | 'Ordered' | - |

## Medicine

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Medicine_ID | int(11) | NO | PRI | - | auto_increment |
| Medicine_Name | varchar(100) | NO | - | - | - |
| Manufacturer | varchar(100) | YES | - | NULL | - |
| Unit_Price | decimal(10,2) | NO | - | - | - |
| Stock_Quantity | int(11) | NO | - | 0 | - |

## Nurse

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Nurse_ID | int(11) | NO | PRI | - | auto_increment |
| Department_ID | int(11) | NO | MUL | - | - |
| Nurse_Name | varchar(100) | NO | - | - | - |
| Phone | varchar(15) | YES | UNI | NULL | - |
| Qualification | varchar(100) | YES | - | NULL | - |

## Patient

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Patient_ID | int(11) | NO | PRI | - | auto_increment |
| Patient_Name | varchar(100) | NO | - | - | - |
| Date_of_Birth | date | NO | - | - | - |
| Gender | varchar(20) | NO | - | - | - |
| Blood_Group | varchar(5) | YES | - | NULL | - |
| Phone | varchar(15) | NO | UNI | - | - |
| Email | varchar(100) | YES | UNI | NULL | - |
| Address | varchar(255) | YES | - | NULL | - |

## Payment

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Payment_ID | int(11) | NO | PRI | - | auto_increment |
| Patient_ID | int(11) | NO | MUL | - | - |
| Admission_ID | int(11) | YES | MUL | NULL | - |
| Insurance_ID | int(11) | YES | MUL | NULL | - |
| Amount | decimal(12,2) | NO | - | - | - |
| Payment_Date | datetime | NO | - | - | - |
| Payment_Method | varchar(30) | NO | - | - | - |
| Payment_Status | varchar(20) | NO | - | 'Paid' | - |

## Prescription

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Prescription_ID | int(11) | NO | PRI | - | auto_increment |
| Patient_ID | int(11) | NO | MUL | - | - |
| Doctor_ID | int(11) | NO | MUL | - | - |
| Prescription_Date | date | NO | - | - | - |
| Notes | varchar(255) | YES | - | NULL | - |

## Prescription_Medicine

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Prescription_ID | int(11) | NO | PRI | - | - |
| Medicine_ID | int(11) | NO | PRI | - | - |
| Dosage | varchar(100) | NO | - | - | - |
| Frequency | varchar(100) | NO | - | - | - |
| Duration_Days | int(11) | NO | - | - | - |

## Staff

| Column | Type | Null | Key | Default | Extra |
|--------|------|------|-----|---------|-------|
| Staff_ID | int(11) | NO | PRI | - | auto_increment |
| Hospital_ID | int(11) | NO | MUL | - | - |
| Staff_Name | varchar(100) | NO | - | - | - |
| Role | varchar(50) | NO | - | - | - |
| Phone | varchar(15) | YES | UNI | NULL | - |
| Email | varchar(100) | YES | UNI | NULL | - |

