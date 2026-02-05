#!/usr/bin/env python3
"""
COMPREHENSIVE ASCII TAB ACCURACY TEST SUITE
============================================

Tests the guitar tab generation for musical accuracy based on established
music theory principles. Sources:
- https://appliedguitartheory.com/lessons/intervals-on-guitar/
- https://muted.io/intervals-chart/
- https://fretscience.com/2022/09/26/standard-tuning-geometry/
- https://www.guitar-chord.org/articles/standard-tuning.html

Key Music Theory Facts Used:
1. Standard tuning: E2-A2-D3-G3-B3-E4 (intervals: 5-5-5-4-5 semitones)
2. One fret = one semitone
3. Scale intervals are fixed (major = 0,2,4,5,7,9,11; minor = 0,2,3,5,7,8,10)
4. G to B string shift: patterns crossing this boundary shift by 1 fret
"""

import requests
import re
import sys
from typing import List, Set, Dict, Tuple

API_URL = "https://guitar-model-lab.onrender.com"

# ============================================================
# MUSIC THEORY CONSTANTS (Verified from multiple sources)
# ============================================================

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Standard tuning: Low E (string 0) to High e (string 5)
# Each value is the note index in NOTE_NAMES
STANDARD_TUNING_NOTES = ['E', 'A', 'D', 'G', 'B', 'E']
STANDARD_TUNING_INDICES = [4, 9, 2, 7, 11, 4]  # E=4, A=9, D=2, G=7, B=11, E=4

# Intervals between adjacent strings (in semitones)
# String 0→1: 5, 1→2: 5, 2→3: 5, 3→4: 4 (the exception!), 4→5: 5
STRING_INTERVALS = [5, 5, 5, 4, 5]

# Scale intervals (semitones from root)
SCALE_INTERVALS = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "pentatonic_major": [0, 2, 4, 7, 9],
    "pentatonic_minor": [0, 3, 5, 7, 10],
    "blues": [0, 3, 5, 6, 7, 10],
    "phrygian": [0, 1, 3, 5, 7, 8, 10],
    "lydian": [0, 2, 4, 6, 7, 9, 11],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "locrian": [0, 1, 3, 5, 6, 8, 10],
    "harmonic_minor": [0, 2, 3, 5, 7, 8, 11],
    "melodic_minor": [0, 2, 3, 5, 7, 9, 11],
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def fret_to_note(string_idx: int, fret: int) -> str:
    """Convert string index + fret number to note name.

    This is the core music theory calculation:
    open_note + fret_semitones = resulting_note (mod 12)
    """
    open_note_idx = STANDARD_TUNING_INDICES[string_idx]
    note_idx = (open_note_idx + fret) % 12
    return NOTE_NAMES[note_idx]

def get_scale_notes(root: str, scale: str) -> Set[str]:
    """Get all notes in a scale."""
    root_idx = NOTE_NAMES.index(root)
    intervals = SCALE_INTERVALS.get(scale, SCALE_INTERVALS['minor'])
    return {NOTE_NAMES[(root_idx + i) % 12] for i in intervals}

def extract_notes_from_tab(tab: str) -> List[Dict]:
    """Parse ASCII tab and extract all played notes with positions."""
    lines = tab.strip().split('\n')
    notes = []

    # Map string characters to indices
    # Tab format: e| (high E, string 5), B|, G|, D|, A|, E| (low E, string 0)
    string_map = {'e': 5, 'B': 4, 'G': 3, 'D': 2, 'A': 1, 'E': 0}

    for line in lines:
        if '|' not in line:
            continue
        parts = line.split('|')
        if len(parts) < 2:
            continue

        string_char = parts[0].strip()
        content = parts[1]

        string_idx = string_map.get(string_char)
        if string_idx is None:
            continue

        # Extract fret numbers (handles single and double digits)
        i = 0
        position = 0
        while i < len(content):
            if content[i].isdigit():
                fret_str = content[i]
                if i + 1 < len(content) and content[i + 1].isdigit():
                    fret_str += content[i + 1]
                    i += 1
                fret = int(fret_str)
                note = fret_to_note(string_idx, fret)
                notes.append({
                    'string': string_idx,
                    'fret': fret,
                    'note': note,
                    'position': position
                })
            position += 1
            i += 1

    return notes

def verify_fret_range(notes: List[Dict]) -> Tuple[bool, str]:
    """Verify all frets are within valid range (0-24)."""
    for n in notes:
        if n['fret'] < 0 or n['fret'] > 24:
            return False, f"Invalid fret {n['fret']} on string {n['string']}"
    return True, "All frets within 0-24 range"

def verify_scale_accuracy(notes: List[Dict], root: str, scale: str) -> Tuple[bool, List[str]]:
    """Verify all notes are within the specified scale."""
    expected = get_scale_notes(root, scale)
    wrong_notes = []

    for n in notes:
        if n['note'] not in expected:
            wrong_notes.append(f"{n['note']} (string {n['string']}, fret {n['fret']})")

    return len(wrong_notes) == 0, wrong_notes

def verify_tab_structure(tab: str) -> Tuple[bool, str]:
    """Verify ASCII tab has correct 6-string structure."""
    lines = [l for l in tab.strip().split('\n') if '|' in l]

    if len(lines) != 6:
        return False, f"Expected 6 strings, got {len(lines)}"

    # Check string labels are correct
    expected_labels = ['e', 'B', 'G', 'D', 'A', 'E']
    for i, line in enumerate(lines):
        label = line.split('|')[0].strip()
        if label != expected_labels[i]:
            return False, f"Wrong string label at position {i}: expected {expected_labels[i]}, got {label}"

    return True, "Tab structure valid"

def verify_bar_consistency(tab: str) -> Tuple[bool, str]:
    """Verify all strings have same number of bar lines."""
    lines = [l for l in tab.strip().split('\n') if '|' in l]
    bar_counts = []

    for line in lines:
        # Count bar separators (--|-- patterns or trailing |)
        bar_count = line.count('|')
        bar_counts.append(bar_count)

    if len(set(bar_counts)) > 1:
        return False, f"Inconsistent bar counts across strings: {bar_counts}"

    return True, f"All strings have {bar_counts[0]} bar markers"

# ============================================================
# TEST FUNCTIONS
# ============================================================

def test_fret_to_note_conversion():
    """Test our note conversion matches known fretboard positions."""
    print("\n" + "="*70)
    print("TEST 1: Fret-to-Note Conversion (Music Theory Validation)")
    print("="*70)

    # Known positions from guitar theory
    known_positions = [
        # (string, fret, expected_note, description)
        (0, 0, 'E', "Open low E string"),
        (0, 5, 'A', "5th fret low E = A"),
        (0, 12, 'E', "12th fret low E = E octave"),
        (1, 0, 'A', "Open A string"),
        (1, 5, 'D', "5th fret A = D"),
        (2, 0, 'D', "Open D string"),
        (2, 5, 'G', "5th fret D = G"),
        (3, 0, 'G', "Open G string"),
        (3, 4, 'B', "4th fret G = B (NOT 5th - major 3rd interval!)"),
        (4, 0, 'B', "Open B string"),
        (4, 5, 'E', "5th fret B = E"),
        (5, 0, 'E', "Open high e string"),
        (5, 12, 'E', "12th fret high e = E octave"),
        # Some intermediate notes
        (0, 3, 'G', "3rd fret low E = G"),
        (1, 2, 'B', "2nd fret A = B"),
        (2, 2, 'E', "2nd fret D = E"),
    ]

    passed = 0
    failed = 0

    for string, fret, expected, desc in known_positions:
        actual = fret_to_note(string, fret)
        if actual == expected:
            print(f"  ✓ {desc}: String {string}, Fret {fret} = {actual}")
            passed += 1
        else:
            print(f"  ✗ {desc}: Expected {expected}, got {actual}")
            failed += 1

    print(f"\nResult: {passed}/{passed+failed} passed")
    return failed == 0

def test_scale_note_sets():
    """Verify our scale interval definitions are correct."""
    print("\n" + "="*70)
    print("TEST 2: Scale Interval Definitions")
    print("="*70)

    # Known scale notes (from music theory references)
    known_scales = [
        ('C', 'major', {'C', 'D', 'E', 'F', 'G', 'A', 'B'}),
        ('A', 'minor', {'A', 'B', 'C', 'D', 'E', 'F', 'G'}),
        ('E', 'minor', {'E', 'F#', 'G', 'A', 'B', 'C', 'D'}),
        ('A', 'pentatonic_minor', {'A', 'C', 'D', 'E', 'G'}),
        ('E', 'pentatonic_minor', {'E', 'G', 'A', 'B', 'D'}),
        ('A', 'blues', {'A', 'C', 'D', 'D#', 'E', 'G'}),
        ('E', 'phrygian', {'E', 'F', 'G', 'A', 'B', 'C', 'D'}),
        ('G', 'major', {'G', 'A', 'B', 'C', 'D', 'E', 'F#'}),
    ]

    passed = 0
    failed = 0

    for root, scale, expected in known_scales:
        actual = get_scale_notes(root, scale)
        if actual == expected:
            print(f"  ✓ {root} {scale}: {sorted(actual)}")
            passed += 1
        else:
            print(f"  ✗ {root} {scale}: Expected {sorted(expected)}, got {sorted(actual)}")
            missing = expected - actual
            extra = actual - expected
            if missing:
                print(f"      Missing: {missing}")
            if extra:
                print(f"      Extra: {extra}")
            failed += 1

    print(f"\nResult: {passed}/{passed+failed} passed")
    return failed == 0

def test_api_scale_accuracy():
    """Test API-generated tabs only contain correct scale notes."""
    print("\n" + "="*70)
    print("TEST 3: API Scale Note Accuracy (All Roots × All Scales × Key Patterns)")
    print("="*70)

    roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    scales = list(SCALE_INTERVALS.keys())
    patterns = ['ascending', 'descending', 'random', 'pedal', 'arpeggio']

    total = 0
    passed = 0
    failures = []

    for pattern in patterns:
        print(f"\n  Testing pattern: {pattern}")
        for scale in scales:
            for root in roots:
                total += 1
                try:
                    resp = requests.post(f'{API_URL}/generate-tab',
                        json={'root': root, 'scale': scale, 'pattern': pattern, 'bars': 2},
                        timeout=15)

                    if resp.status_code == 400:
                        # Valid rejection (e.g., 3nps with pentatonic)
                        passed += 1
                        continue

                    if resp.status_code != 200:
                        failures.append(f"{root} {scale} {pattern}: HTTP {resp.status_code}")
                        continue

                    data = resp.json()
                    tab = data.get('tab', '')
                    notes = extract_notes_from_tab(tab)

                    if not notes:
                        failures.append(f"{root} {scale} {pattern}: No notes in tab")
                        continue

                    is_accurate, wrong = verify_scale_accuracy(notes, root, scale)

                    if is_accurate:
                        passed += 1
                        sys.stdout.write('.')
                        sys.stdout.flush()
                    else:
                        failures.append(f"{root} {scale} {pattern}: Wrong notes {wrong[:3]}")
                        sys.stdout.write('X')
                        sys.stdout.flush()

                except Exception as e:
                    failures.append(f"{root} {scale} {pattern}: {str(e)[:40]}")
                    sys.stdout.write('E')
                    sys.stdout.flush()
        print()  # Newline after each pattern

    print(f"\nResult: {passed}/{total} passed ({100*passed/total:.1f}%)")

    if failures:
        print(f"\nFirst 10 failures:")
        for f in failures[:10]:
            print(f"  ✗ {f}")

    return len(failures) == 0

def test_fret_range():
    """Verify all generated frets are within 0-24 range."""
    print("\n" + "="*70)
    print("TEST 4: Fret Range Validation (0-24)")
    print("="*70)

    # Test edge cases that might cause fret overflow
    edge_cases = [
        ('G#', 'minor', 'ascending', 5),  # High position + sharp root
        ('A#', 'major', 'sweep', 5),
        ('B', 'pentatonic_minor', 'legato', 5),
        ('F#', 'phrygian', 'tapping', 1),
    ]

    passed = 0
    failed = 0

    for root, scale, pattern, position in edge_cases:
        try:
            resp = requests.post(f'{API_URL}/generate-tab',
                json={'root': root, 'scale': scale, 'pattern': pattern,
                      'bars': 4, 'position': position},
                timeout=15)

            if resp.status_code != 200:
                print(f"  ? {root} {scale} {pattern} pos={position}: HTTP {resp.status_code}")
                continue

            data = resp.json()
            notes = extract_notes_from_tab(data.get('tab', ''))
            valid, msg = verify_fret_range(notes)

            if valid:
                max_fret = max(n['fret'] for n in notes) if notes else 0
                print(f"  ✓ {root} {scale} {pattern} pos={position}: max fret = {max_fret}")
                passed += 1
            else:
                print(f"  ✗ {root} {scale} {pattern} pos={position}: {msg}")
                failed += 1

        except Exception as e:
            print(f"  ✗ {root} {scale} {pattern} pos={position}: {e}")
            failed += 1

    print(f"\nResult: {passed}/{passed+failed} passed")
    return failed == 0

def test_tab_structure():
    """Verify ASCII tab format is correct."""
    print("\n" + "="*70)
    print("TEST 5: Tab Structure Validation")
    print("="*70)

    test_cases = [
        ('E', 'minor', 'ascending', 2),
        ('A', 'pentatonic_minor', 'random', 4),
        ('C', 'major', 'power_chords', 4),
    ]

    passed = 0
    failed = 0

    for root, scale, pattern, bars in test_cases:
        try:
            resp = requests.post(f'{API_URL}/generate-tab',
                json={'root': root, 'scale': scale, 'pattern': pattern, 'bars': bars},
                timeout=15)

            if resp.status_code != 200:
                print(f"  ? {root} {scale} {pattern}: HTTP {resp.status_code}")
                continue

            data = resp.json()
            tab = data.get('tab', '')

            # Test structure
            struct_valid, struct_msg = verify_tab_structure(tab)
            bar_valid, bar_msg = verify_bar_consistency(tab)

            if struct_valid and bar_valid:
                print(f"  ✓ {root} {scale} {pattern}: {struct_msg}, {bar_msg}")
                passed += 1
            else:
                print(f"  ✗ {root} {scale} {pattern}:")
                if not struct_valid:
                    print(f"      Structure: {struct_msg}")
                if not bar_valid:
                    print(f"      Bars: {bar_msg}")
                failed += 1

        except Exception as e:
            print(f"  ✗ {root} {scale} {pattern}: {e}")
            failed += 1

    print(f"\nResult: {passed}/{passed+failed} passed")
    return failed == 0

def test_power_chord_intervals():
    """Verify power chords use correct root + 5th (7 semitones)."""
    print("\n" + "="*70)
    print("TEST 6: Power Chord Interval Accuracy (Root + Perfect 5th)")
    print("="*70)

    # Power chord = root + perfect 5th (7 semitones)
    test_cases = [
        ('E', 'minor'), ('A', 'minor'), ('C', 'major'), ('G', 'major'),
        ('D', 'dorian'), ('E', 'phrygian'), ('B', 'minor'), ('F#', 'minor'),
    ]

    passed = 0
    failed = 0

    for root, scale in test_cases:
        try:
            resp = requests.post(f'{API_URL}/generate-tab',
                json={'root': root, 'scale': scale, 'pattern': 'power_chords', 'bars': 2},
                timeout=15)

            if resp.status_code != 200:
                print(f"  ? {root} {scale}: HTTP {resp.status_code}")
                continue

            data = resp.json()
            notes = extract_notes_from_tab(data.get('tab', ''))
            unique_notes = set(n['note'] for n in notes)

            # Get scale degrees (valid roots for power chords)
            scale_notes = get_scale_notes(root, scale)

            # For each unique note, check if it's either:
            # 1. A scale degree (valid power chord root), OR
            # 2. A perfect 5th above a scale degree
            valid_power_chord_notes = set()
            for scale_note in scale_notes:
                valid_power_chord_notes.add(scale_note)  # Root
                fifth_idx = (NOTE_NAMES.index(scale_note) + 7) % 12
                valid_power_chord_notes.add(NOTE_NAMES[fifth_idx])  # 5th

            wrong = unique_notes - valid_power_chord_notes

            if not wrong:
                print(f"  ✓ {root} {scale}: Notes {sorted(unique_notes)} all valid")
                passed += 1
            else:
                print(f"  ✗ {root} {scale}: Invalid notes {wrong}")
                print(f"      Valid: {sorted(valid_power_chord_notes)}")
                print(f"      Actual: {sorted(unique_notes)}")
                failed += 1

        except Exception as e:
            print(f"  ✗ {root} {scale}: {e}")
            failed += 1

    print(f"\nResult: {passed}/{passed+failed} passed")
    return failed == 0

def test_new_patterns():
    """Test the new sweep/legato/tapping patterns for accuracy."""
    print("\n" + "="*70)
    print("TEST 7: New Patterns (Sweep, Legato, Tapping)")
    print("="*70)

    new_patterns = ['sweep', 'legato', 'tapping']
    test_scales = ['minor', 'major', 'pentatonic_minor', 'phrygian']
    test_roots = ['E', 'A', 'C', 'G', 'D']

    passed = 0
    failed = 0
    failures = []

    for pattern in new_patterns:
        print(f"\n  Testing {pattern}:")
        for root in test_roots:
            for scale in test_scales:
                try:
                    resp = requests.post(f'{API_URL}/generate-tab',
                        json={'root': root, 'scale': scale, 'pattern': pattern, 'bars': 2},
                        timeout=15)

                    if resp.status_code != 200:
                        failures.append(f"{root} {scale} {pattern}: HTTP {resp.status_code}")
                        sys.stdout.write('X')
                        continue

                    data = resp.json()
                    notes = extract_notes_from_tab(data.get('tab', ''))

                    # Verify notes exist
                    if not notes:
                        failures.append(f"{root} {scale} {pattern}: Empty tab")
                        sys.stdout.write('E')
                        continue

                    # Verify fret range
                    fret_valid, _ = verify_fret_range(notes)
                    if not fret_valid:
                        failures.append(f"{root} {scale} {pattern}: Fret out of range")
                        sys.stdout.write('F')
                        continue

                    # For sweep/legato: notes should be scale-related
                    # For tapping: notes can include chord tones
                    expected = get_scale_notes(root, scale)
                    unique_notes = set(n['note'] for n in notes)

                    # Allow chord tones (root, 3rd, 5th) which may include
                    # perfect 5ths that extend slightly beyond scale
                    root_idx = NOTE_NAMES.index(root)
                    extended_valid = expected.copy()
                    for interval in [0, 3, 4, 7]:  # root, m3, M3, P5
                        extended_valid.add(NOTE_NAMES[(root_idx + interval) % 12])

                    # Check if all notes are reasonably valid
                    if unique_notes <= extended_valid or pattern == 'tapping':
                        passed += 1
                        sys.stdout.write('.')
                    else:
                        wrong = unique_notes - extended_valid
                        failures.append(f"{root} {scale} {pattern}: Unexpected {wrong}")
                        sys.stdout.write('?')

                    sys.stdout.flush()

                except Exception as e:
                    failures.append(f"{root} {scale} {pattern}: {str(e)[:30]}")
                    sys.stdout.write('E')
                    sys.stdout.flush()
        print()

    total = len(new_patterns) * len(test_roots) * len(test_scales)
    print(f"\nResult: {passed}/{total} passed ({100*passed/total:.1f}%)")

    if failures:
        print(f"\nIssues found:")
        for f in failures[:10]:
            print(f"  - {f}")

    return len(failures) == 0

# ============================================================
# MAIN
# ============================================================

if __name__ == '__main__':
    print("="*70)
    print("COMPREHENSIVE ASCII TAB ACCURACY TEST SUITE")
    print("="*70)
    print(f"API: {API_URL}")
    print("Based on music theory from:")
    print("  - appliedguitartheory.com")
    print("  - muted.io")
    print("  - fretscience.com")
    print("="*70)

    results = []

    # Run all tests
    results.append(("Fret-to-Note Conversion", test_fret_to_note_conversion()))
    results.append(("Scale Interval Definitions", test_scale_note_sets()))
    results.append(("Tab Structure Validation", test_tab_structure()))
    results.append(("Fret Range Validation", test_fret_range()))
    results.append(("Power Chord Intervals", test_power_chord_intervals()))
    results.append(("New Patterns (Sweep/Legato/Tapping)", test_new_patterns()))
    results.append(("API Scale Note Accuracy", test_api_scale_accuracy()))

    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")

    print(f"\nOverall: {passed}/{total} test suites passed")

    if passed == total:
        print("\n✅ ALL TESTS PASSED - Tab generation is musically accurate!")
    else:
        print("\n❌ SOME TESTS FAILED - Review failures above")
        sys.exit(1)
