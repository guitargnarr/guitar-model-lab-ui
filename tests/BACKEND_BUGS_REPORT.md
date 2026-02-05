# Guitar Model Lab - Backend Bug Report

**Generated:** February 5, 2026
**Test Coverage:** 1,920 dropdown combinations
**Pass Rate:** 90.6% (1,740/1,920)

---

## Bug #1: Division by Zero in Pedal/Arpeggio Patterns (36 failures)

**Affected Combinations:**
- `pentatonic_major` + `pedal` pattern + `D` or `G` CAGED shape
- `pentatonic_major` + `arpeggio` pattern + `G` CAGED shape
- All 12 root notes affected

**Error Message:**
```
API error: integer modulo by zero
```

**Example Failing Requests:**
```json
{"root": "C", "scale": "pentatonic_major", "pattern": "pedal", "caged_shape": "D"}
{"root": "A", "scale": "pentatonic_major", "pattern": "arpeggio", "caged_shape": "G"}
```

**Root Cause:** The backend likely has a division or modulo operation that receives 0 when calculating positions for certain CAGED shape + pattern combinations.

**Severity:** HIGH - Complete API failure for 36 valid input combinations

---

## Bug #2: Invalid Fret Number (25) Generated (12 failures)

**Affected Combinations:**
- `power_chords` or `progression` pattern
- `G` CAGED shape
- Higher root notes (D#, F, G#, A#)

**Error:** Tab contains fret 25 (maximum valid is 24)

**Example Failing Requests:**
```json
{"root": "D#", "scale": "pentatonic_major", "pattern": "power_chords", "caged_shape": "G"}
{"root": "G#", "scale": "pentatonic_minor", "pattern": "progression", "caged_shape": "G"}
```

**Root Cause:** The G shape calculation doesn't clamp fret positions to maximum 24 when combined with higher root notes and chord patterns.

**Severity:** MEDIUM - Produces invalid tab output

---

## Bug #3: 3nps Returns 500 Instead of 400 (132 failures)

**Affected Combinations:**
- `3nps` pattern with any 5 or 6-note scale:
  - `pentatonic_major` (5 notes)
  - `pentatonic_minor` (5 notes)
  - `blues` (6 notes)
- All roots and CAGED shapes affected

**Expected Behavior:** API should return HTTP 400 with helpful error message:
```json
{"detail": "3NPS pattern requires 7-note scale (pentatonic has only 5)"}
```

**Actual Behavior:** Returns HTTP 500 (Internal Server Error)

**Root Cause:** Missing input validation before pattern generation logic executes

**Severity:** LOW - Correct behavior to reject, just wrong error code

---

## Valid Combinations Summary

| Scale Type | Patterns Working | CAGED Shapes Working |
|------------|------------------|----------------------|
| 7-note scales (major, minor, modes) | All 8 patterns ✅ | N/A |
| pentatonic_major | 5/8 (ascending, descending, random, power_chords*, progression*) | E, A, C ✅ / D, G ❌ |
| pentatonic_minor | 5/8 (same as above) | E, A, C ✅ / D, G ❌ |
| blues | 7/8 (all except 3nps) | N/A |

*power_chords and progression fail only with G shape + high roots

---

## Recommended Fixes

### Fix #1: Add Division Safety Check
```python
# In pattern generation logic
if divisor == 0:
    divisor = 1  # or handle gracefully
```

### Fix #2: Clamp Fret Range
```python
fret = min(max(fret, 0), 24)  # Ensure 0-24 range
```

### Fix #3: Input Validation for 3nps
```python
@app.post("/generate-tab")
def generate_tab(params: TabParams):
    scale_notes = len(SCALE_INTERVALS[params.scale])
    if params.pattern == "3nps" and scale_notes < 7:
        raise HTTPException(
            status_code=400,
            detail=f"3NPS pattern requires 7-note scale ({params.scale} has {scale_notes})"
        )
```

---

## Test Commands

Run exhaustive tests:
```bash
python3 tests/exhaustive_combination_tests.py
```

Run focused validation tests:
```bash
python3 tests/tab_accuracy_tests.py
```
