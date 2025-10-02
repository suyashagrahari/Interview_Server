# Corrected Interview Flow - Question Index Mapping

## Problem Fixed
The issue was in the pool question index calculation. The previous logic `Math.floor(interview.questions.length / 2)` was incorrect.

## Correct Flow Pattern

### Question Pool Schema (9 questions total):
```
Index 0: Introduction Question
Index 1: Technical Question 1
Index 2: Technical Question 2
Index 3: Technical Question 3
Index 4: Technical Question 4
Index 5: Technical Question 5
Index 6: Technical Question 6
Index 7: Technical Question 7
Index 8: Technical Question 8
```

### Interview Schema (18 questions total - alternating pattern):

| Interview Position | Question Type | Pool Index | Description |
|-------------------|---------------|------------|-------------|
| 0 | Pool | 0 | Introduction Question |
| 1 | Follow-up | - | Follow-up to Introduction |
| 2 | Pool | 1 | Technical Question 1 |
| 3 | Follow-up | - | Follow-up to Technical Q1 |
| 4 | Pool | 2 | Technical Question 2 |
| 5 | Follow-up | - | Follow-up to Technical Q2 |
| 6 | Pool | 3 | Technical Question 3 |
| 7 | Follow-up | - | Follow-up to Technical Q3 |
| 8 | Pool | 4 | Technical Question 4 |
| 9 | Follow-up | - | Follow-up to Technical Q4 |
| 10 | Pool | 5 | Technical Question 5 |
| 11 | Follow-up | - | Follow-up to Technical Q5 |
| 12 | Pool | 6 | Technical Question 6 |
| 13 | Follow-up | - | Follow-up to Technical Q6 |
| 14 | Pool | 7 | Technical Question 7 |
| 15 | Follow-up | - | Follow-up to Technical Q7 |
| 16 | Pool | 8 | Technical Question 8 |
| 17 | Follow-up | - | Follow-up to Technical Q8 |

## Fixed Logic

### Previous (Incorrect) Logic:
```javascript
const poolQuestionIndex = Math.floor(interview.questions.length / 2);
```

**Problem**: This would give wrong indices:
- At position 1 (follow-up): `Math.floor(1/2) = 0` → Would repeat introduction
- At position 3 (follow-up): `Math.floor(3/2) = 1` → Correct
- At position 5 (follow-up): `Math.floor(5/2) = 2` → Correct

### New (Correct) Logic:
```javascript
const poolQuestionIndex = Math.floor((interview.questions.length + 1) / 2);
```

**Solution**: This gives correct indices:
- At position 1 (follow-up): `Math.floor((1+1)/2) = 1` → Technical Q1 ✓
- At position 3 (follow-up): `Math.floor((3+1)/2) = 2` → Technical Q2 ✓
- At position 5 (follow-up): `Math.floor((5+1)/2) = 3` → Technical Q3 ✓

## Step-by-Step Flow Example

### 1. Start Interview
- Creates interview record
- Generates 9 questions in QuestionPool only
- Interview.questions = [] (empty)

### 2. Get First Question
- Retrieves QuestionPool[0] (Introduction)
- Stores in Interview.questions[0] with questionType: "pool"
- Marks QuestionPool[0] as asked

### 3. Submit Introduction Answer
- Current question at position 0 is type "pool"
- Generates follow-up based on introduction answer
- Stores follow-up in Interview.questions[1] with questionType: "followup"

### 4. Submit Follow-up Answer
- Current question at position 1 is type "followup"
- Calculates pool index: `Math.floor((1+1)/2) = 1`
- Retrieves QuestionPool[1] (Technical Q1)
- Stores in Interview.questions[2] with questionType: "pool"
- Marks QuestionPool[1] as asked

### 5. Continue Pattern...
- This alternating pattern continues until 18 total questions

## Key Benefits of Fix

✅ **Correct Alternating Pattern**: Pool → Follow-up → Pool → Follow-up...
✅ **No Duplicate Questions**: Each pool question used exactly once
✅ **Progressive Storage**: Questions stored only when asked
✅ **Accurate Tracking**: Proper question completion analytics
✅ **Scalable Logic**: Works for any number of pool questions

## Testing Verification

To verify the fix works:
1. Start interview → Only QuestionPool populated
2. Get first question → Interview.questions[0] = Introduction
3. Submit intro → Interview.questions[1] = Follow-up
4. Submit follow-up → Interview.questions[2] = Technical Q1
5. Submit technical → Interview.questions[3] = Follow-up to Q1
6. Continue pattern → Should alternate correctly

The logic now correctly maps follow-up positions to the next available pool question index.