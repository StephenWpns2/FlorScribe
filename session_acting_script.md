# Medical Session Acting Script - Doctor and Patient Conversation

## Session Information
- **Patient Name**: Sarah Johnson
- **Patient ID**: P-2024-001
- **Date**: [Current Date]
- **Provider**: Dr. Michael Chen, MD
- **Session Type**: Established Patient Office Visit

---

## Conversation Script

**[Session Start]**

**Doctor**: Good morning, Sarah. How are you doing today?

**Patient**: Good morning, Doctor Chen. I'm okay, but I've been having some issues lately.

**Doctor**: I'm sorry to hear that. What brings you in today?

**Patient**: Well, I've been having headaches for the past week. They started last Monday and they're getting worse. They're mostly in the front of my head, and they seem to happen more in the afternoon.

**Doctor**: I see. Can you describe the pain? Is it sharp, throbbing, or pressure-like?

**Patient**: It's more of a throbbing pain. Sometimes it's really bad, like an 8 out of 10. I've been taking ibuprofen but it doesn't seem to help much.

**Doctor**: Have you noticed any other symptoms along with the headaches? Any nausea, sensitivity to light, or vision changes?

**Patient**: Yes, actually. I do feel a bit nauseous sometimes, especially when the headache is really bad. And bright lights do bother me.

**Doctor**: Okay. How about your blood pressure? Have you been checking it at home?

**Patient**: I have a monitor at home. I checked it this morning and it was 148 over 92. That seems high, doesn't it?

**Doctor**: Yes, that is elevated. We'll need to monitor that. Have you been taking your blood pressure medication regularly?

**Patient**: I've been trying to, but I've missed a few doses this week because of the headaches. I'm on lisinopril, 10 milligrams once a day.

**Doctor**: I understand. Let me check your vitals here. [Pause] Your blood pressure right now is 150 over 94. Your heart rate is 88 beats per minute, and your temperature is 98.6 degrees Fahrenheit. Your oxygen saturation is 98 percent.

**Patient**: So my blood pressure is still high then?

**Doctor**: Yes, it is. We need to get that under better control. Are you still taking your metformin for your diabetes?

**Patient**: Yes, I take 500 milligrams twice a day with meals. My blood sugars have been okay, usually around 120 to 140.

**Doctor**: Good. Now, let me ask you about your back. I see in your chart you've had some low back pain in the past. How has that been?

**Patient**: It's been okay actually. The back pain hasn't been bothering me much lately. It's really just these headaches that are the problem.

**Doctor**: I understand. Let me do a quick neurological exam. Can you follow my finger with your eyes? Good. Now, can you touch your nose with your finger? Perfect. Your reflexes look normal.

**Patient**: Is everything okay?

**Doctor**: Yes, the neurological exam looks good. Based on your symptoms and the pattern of your headaches, I'm concerned about a few things. First, your elevated blood pressure could be contributing to the headaches. Second, given the pattern and associated symptoms, you might be experiencing migraines.

**Patient**: Migraines? I've never had those before.

**Doctor**: Sometimes they can develop or become more frequent, especially with stress or changes in blood pressure. I'd like to do a few things today. First, I'm going to order a basic metabolic panel to check your kidney function and electrolytes, especially since you're on blood pressure medication. I'll also order a complete blood count to make sure everything looks good there.

**Patient**: Okay, that sounds reasonable.

**Doctor**: I'm also going to order a chest X-ray just to be thorough, and an EKG to check your heart rhythm, given the elevated blood pressure.

**Patient**: Is that really necessary? I feel fine otherwise.

**Doctor**: Given your elevated blood pressure and the fact that we're adjusting your medications, I think it's prudent. It's better to be safe.

**Patient**: Alright, if you think so.

**Doctor**: Now, for your headaches, I'm going to prescribe sumatriptan, 50 milligrams, to take as needed when you feel a migraine coming on. You can take one tablet, and if needed, you can take another one after two hours, but don't exceed two tablets in 24 hours.

**Patient**: Okay, I'll try that.

**Doctor**: For your blood pressure, I'm going to increase your lisinopril to 20 milligrams once daily. Make sure you take it at the same time every day. I also want you to monitor your blood pressure at home twice a day, morning and evening, and keep a log.

**Patient**: I can do that. Should I call if it stays high?

**Doctor**: Yes, absolutely. If your systolic pressure, that's the top number, stays above 160, or if your diastolic, the bottom number, stays above 100, give us a call. Also, if the headaches get worse or if you develop any new symptoms, let us know right away.

**Patient**: I will. When should I come back?

**Doctor**: I'd like to see you back in two weeks to check your blood pressure and see how the headaches are doing. If things get worse before then, don't wait. Come in sooner.

**Patient**: Okay, thank you, Doctor Chen.

**Doctor**: You're welcome. Take care, and I'll see you in two weeks. The nurse will give you the lab orders and prescriptions on your way out.

**Patient**: Thank you. Have a good day.

**[Session End]**

---

## Expected Clinical Extraction

### Problems/Diagnoses
1. **Headache, unspecified** - ICD-10: R51.9
2. **Essential (primary) hypertension** - ICD-10: I10
3. **Type 2 diabetes mellitus without complications** - ICD-10: E11.9 (from patient history)

### Medications Mentioned
1. **Lisinopril** - 10 mg once daily (current), increased to 20 mg once daily (new prescription)
2. **Metformin** - 500 mg twice daily with meals
3. **Ibuprofen** - Over-the-counter, as needed (patient self-medicating)
4. **Sumatriptan** - 50 mg as needed for migraines (new prescription)

### Orders
1. **Basic metabolic panel (BMP)** - Lab test - CPT: 80048
2. **Complete blood count (CBC)** - Lab test - CPT: 85027
3. **Chest X-ray, single view** - Imaging - CPT: 71045
4. **Electrocardiogram (EKG/ECG)** - Procedure - CPT: 93000

### Vital Signs Documented
1. **Blood Pressure**: 150/94 mmHg (in office), 148/92 mmHg (patient reported home reading)
2. **Heart Rate**: 88 bpm
3. **Temperature**: 98.6°F
4. **Oxygen Saturation**: 98%

### Office Visit
- **CPT Code**: 99213 (Established patient office visit, level 3)

---

## Expected Billing Codes Summary

### ICD-10 Codes (Diagnoses)
- **R51.9** - Headache, unspecified
- **I10** - Essential (primary) hypertension
- **E11.9** - Type 2 diabetes mellitus without complications

### CPT Codes (Procedures/Orders)
- **99213** - Established patient office visit, level 3
- **80048** - Basic metabolic panel
- **85027** - Complete blood count (CBC)
- **71045** - Chest X-ray, single view
- **93000** - Electrocardiogram, routine ECG

---

## Testing Notes

This script is designed to test:
1. **Real-time transcription** - Both doctor and patient speech
2. **Clinical extraction** - Problems, medications, orders, vitals
3. **Billing code mapping** - ICD-10 and CPT code extraction
4. **SOAP note generation** - Should include all extracted information
5. **EHR export** - Should properly format all clinical data

### Key Phrases to Test Extraction:
- "headaches" → Should map to R51.9
- "blood pressure" / "148 over 92" / "150 over 94" → Should extract vitals and map to I10
- "type 2 diabetes" / "metformin" → Should map to E11.9
- "basic metabolic panel" / "BMP" → Should map to CPT 80048
- "complete blood count" / "CBC" → Should map to CPT 85027
- "chest X-ray" / "CXR" → Should map to CPT 71045
- "EKG" / "ECG" / "electrocardiogram" → Should map to CPT 93000
- "office visit" → Should map to CPT 99213

### Medication Extraction:
- Should extract: lisinopril (10mg → 20mg), metformin (500mg BID), sumatriptan (50mg PRN), ibuprofen (OTC)

### Vital Signs Extraction:
- Should extract: BP 150/94, HR 88, Temp 98.6°F, SpO2 98%

---

## Usage Instructions

1. Start a new session in the platform
2. Use this script to role-play the conversation
3. Speak naturally, pausing between doctor and patient lines
4. After the session, verify:
   - All transcripts are captured correctly
   - Clinical extraction includes all problems, medications, orders, and vitals
   - Billing codes are correctly mapped (ICD-10 and CPT)
   - SOAP note is generated with all information
   - EHR export includes all clinical data

---

*This script is designed for testing purposes and should be used in a development/testing environment only.*

