#!/usr/bin/env python3
"""
Guitar Model Lab - Comprehensive Tab Accuracy Test Suite
=========================================================

Tests all dropdown combinations and validates:
1. ASCII tab structure (6 strings, correct order, consistent lengths)
2. Music theory accuracy (notes match selected scale)
3. CAGED positioning (correct fret ranges for each shape)
4. Pattern behavior (ascending/descending/pedal/etc.)

Run with: python3 tests/tab_accuracy_tests.py
"""

import requests
import re
import sys
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass

API_URL = "https://guitar-model-lab.onrender.com"

# ============================================================
# Music Theory Reference Data
# ============================================================

STANDARD_TUNING = {'E': 40, 'A': 45, 'D': 50, 'G': 55, 'B': 59, 'e': 64}
CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

SCALE_INTERVALS = {
    'pentatonic_minor': [0, 3, 5, 7, 10],
    'pentatonic_major': [0, 2, 4, 7, 9],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'major': [0, 2, 4, 5, 7, 9, 11],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11],
    'locrian': [0, 1, 3, 5, 6, 8, 10],
    'harmonic_minor': [0, 2, 3, 5, 7, 8, 11],
    'melodic_minor': [0, 2, 3, 5, 7, 9, 11],
    'blues': [0, 3, 5, 6, 7, 10],
}

# Patterns that use chord tones (not strictly scale notes)
CHORD_BASED_PATTERNS = {'power_chords', 'progression', 'arpeggio'}

@dataclass
class TestResult:
    name: str
    passed: bool
    errors: List[str]
    tab: str
    params: Dict

# ============================================================
# Helper Functions
# ============================================================

def parse_tab(tab: str) -> Dict[str, List[int]]:
    """Parse ASCII tab into dict of string -> list of fret numbers"""
    result = {}
    for line in tab.strip().split('\n'):
        match = re.match(r'^([eBGDAE])\|(.+)$', line)
        if match:
            string_name = match.group(1)
            content = match.group(2)
            frets = []
            i = 0
            while i < len(content):
                if content[i].isdigit():
                    num = content[i]
                    if i + 1 < len(content) and content[i + 1].isdigit():
                        num += content[i + 1]
                        i += 1
                    frets.append(int(num))
                i += 1
            result[string_name] = frets
    return result

def get_note_at_fret(string: str, fret: int) -> str:
    """Get note name from string and fret position"""
    open_midi = STANDARD_TUNING.get(string, STANDARD_TUNING.get(string.upper()))
    return CHROMATIC[(open_midi + fret) % 12]

def get_scale_notes(root: str, scale: str) -> Set[str]:
    """Get all note names in a scale"""
    if scale not in SCALE_INTERVALS:
        return set()
    root_idx = CHROMATIC.index(root)
    return {CHROMATIC[(root_idx + i) % 12] for i in SCALE_INTERVALS[scale]}

def get_caged_e_shape_position(root: str) -> int:
    """Get starting fret for CAGED E shape given a root note"""
    root_idx = CHROMATIC.index(root)
    e_idx = CHROMATIC.index('E')
    return (root_idx - e_idx) % 12

# ============================================================
# Validation Functions
# ============================================================

def check_ascii_structure(tab: str) -> List[str]:
    """Validate ASCII tab structure"""
    errors = []
    lines = tab.strip().split('\n')

    if len(lines) != 6:
        errors.append(f"Expected 6 strings, got {len(lines)}")
        return errors

    expected_strings = ['e', 'B', 'G', 'D', 'A', 'E']
    actual_strings = []

    for i, line in enumerate(lines):
        match = re.match(r'^([eBGDAE])\|', line)
        if not match:
            errors.append(f"Line {i+1} missing string label")
            continue
        actual_strings.append(match.group(1))

    if actual_strings != expected_strings:
        errors.append(f"String order: {actual_strings} != {expected_strings}")

    lengths = [len(line) for line in lines]
    if len(set(lengths)) > 1:
        errors.append(f"Inconsistent line lengths: {lengths}")

    valid_chars = set('eBGDAE|0123456789-')
    for i, line in enumerate(lines):
        invalid = set(line) - valid_chars
        if invalid:
            errors.append(f"Line {i+1}: Invalid chars: {invalid}")

    return errors

def check_scale_accuracy(tab: str, root: str, scale: str, pattern: str) -> List[str]:
    """Validate notes are in the selected scale"""
    errors = []

    if pattern in CHORD_BASED_PATTERNS:
        return []  # Skip for chord-based patterns

    parsed = parse_tab(tab)
    scale_notes = get_scale_notes(root, scale)

    if not scale_notes:
        return []

    wrong_notes = []
    for string, frets in parsed.items():
        for fret in frets:
            note = get_note_at_fret(string, fret)
            if note not in scale_notes:
                wrong_notes.append(f"{note}@{string}{fret}")

    if wrong_notes:
        errors.append(f"Notes outside scale: {wrong_notes[:5]}")

    return errors

def check_caged_position(tab: str, root: str, caged_shape: str) -> List[str]:
    """Validate CAGED shape is in correct position"""
    errors = []
    parsed = parse_tab(tab)

    all_frets = [f for frets in parsed.values() for f in frets]
    if not all_frets:
        return []

    expected_base = get_caged_e_shape_position(root)
    shape_offsets = {'E': 0, 'D': 3, 'C': 5, 'A': 7, 'G': 10}
    expected_start = (expected_base + shape_offsets.get(caged_shape, 0)) % 12

    min_fret = min(all_frets)
    valid_starts = [expected_start, expected_start + 12, expected_start - 12]

    if not any(abs(min_fret - v) <= 2 for v in valid_starts if v >= 0):
        errors.append(f"CAGED {caged_shape}: expected fret ~{expected_start}, got {min_fret}")

    return errors

# ============================================================
# Test Runner
# ============================================================

def test_api(params: Dict, test_name: str) -> TestResult:
    """Run a single API test"""
    errors = []

    try:
        resp = requests.post(f"{API_URL}/generate-tab", json=params, timeout=30)

        if resp.status_code != 200:
            error_msg = resp.json().get('detail', resp.text)
            # Expected failures
            if '3NPS requires' in error_msg and params.get('pattern') == '3nps':
                return TestResult(test_name, True, ["Expected: 3nps needs 7-note scale"], "", params)
            return TestResult(test_name, False, [f"API {resp.status_code}: {error_msg}"], "", params)

        data = resp.json()
        tab = data.get('tab', '')

        if not tab:
            return TestResult(test_name, False, ["Empty tab"], "", params)

        # Run validations
        errors.extend(check_ascii_structure(tab))
        errors.extend(check_scale_accuracy(tab, params['root'], params['scale'], params.get('pattern', '')))

        if params.get('caged_shape') and 'pentatonic' in params.get('scale', ''):
            errors.extend(check_caged_position(tab, params['root'], params['caged_shape']))

        return TestResult(test_name, len(errors) == 0, errors, tab, params)

    except Exception as e:
        return TestResult(test_name, False, [f"Exception: {e}"], "", params)

def run_test_suite():
    """Run complete test suite"""

    print("=" * 70)
    print("GUITAR MODEL LAB - TAB ACCURACY TEST SUITE")
    print("=" * 70)

    # Fetch available options
    try:
        scales = requests.get(f"{API_URL}/scales").json().get('scales', [])
        patterns = requests.get(f"{API_URL}/patterns").json().get('patterns', [])
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False

    results = []

    # Suite 1: All scales
    print("\n[SUITE 1] All Scales (E root, ascending)")
    print("-" * 50)
    for scale in scales:
        r = test_api({'root': 'E', 'scale': scale, 'pattern': 'ascending', 'bars': 2}, f"scale_{scale}")
        results.append(r)
        status = "✅" if r.passed else "❌"
        print(f"{status} {scale}: {r.errors[0] if r.errors else 'OK'}")

    # Suite 2: All patterns
    print("\n[SUITE 2] All Patterns (E minor)")
    print("-" * 50)
    for pattern in patterns:
        r = test_api({'root': 'E', 'scale': 'minor', 'pattern': pattern, 'bars': 2}, f"pattern_{pattern}")
        results.append(r)
        status = "✅" if r.passed else "❌"
        print(f"{status} {pattern}: {r.errors[0] if r.errors else 'OK'}")

    # Suite 3: CAGED shapes
    print("\n[SUITE 3] CAGED Shapes (A pentatonic minor)")
    print("-" * 50)
    for shape in ['E', 'D', 'C', 'A', 'G']:
        r = test_api({
            'root': 'A', 'scale': 'pentatonic_minor', 'pattern': 'ascending',
            'bars': 2, 'caged_shape': shape
        }, f"caged_{shape}")
        results.append(r)
        parsed = parse_tab(r.tab) if r.tab else {}
        frets = sorted(set(f for fl in parsed.values() for f in fl)) if parsed else []
        status = "✅" if r.passed else "❌"
        print(f"{status} {shape} Shape (frets {frets}): {r.errors[0] if r.errors else 'OK'}")

    # Suite 4: All root notes
    print("\n[SUITE 4] All Root Notes (pentatonic minor)")
    print("-" * 50)
    for root in CHROMATIC:
        r = test_api({'root': root, 'scale': 'pentatonic_minor', 'pattern': 'ascending', 'bars': 2}, f"root_{root}")
        results.append(r)
        status = "✅" if r.passed else "❌"
        print(f"{status} {root}: {r.errors[0] if r.errors else 'OK'}")

    # Suite 5: CAGED cross-root
    print("\n[SUITE 5] CAGED E Shape (Various Roots)")
    print("-" * 50)
    for root in ['E', 'F', 'G', 'A', 'B', 'C', 'D']:
        expected = get_caged_e_shape_position(root)
        r = test_api({
            'root': root, 'scale': 'pentatonic_minor', 'pattern': 'ascending',
            'bars': 2, 'caged_shape': 'E'
        }, f"caged_E_{root}")
        results.append(r)
        parsed = parse_tab(r.tab) if r.tab else {}
        frets = sorted(set(f for fl in parsed.values() for f in fl)) if parsed else []
        min_f = min(frets) if frets else '?'
        status = "✅" if r.passed else "❌"
        print(f"{status} {root} (expect≈{expected}, got min={min_f}): {r.errors[0] if r.errors else 'OK'}")

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    passed = sum(1 for r in results if r.passed)
    total = len(results)
    pct = 100 * passed / total if total > 0 else 0

    print(f"\nTotal: {total} tests")
    print(f"Passed: {passed} ({pct:.1f}%)")
    print(f"Failed: {total - passed}")

    if passed == total:
        print("\n✅ ALL TESTS PASSED!")
        return True
    else:
        print("\n❌ SOME TESTS FAILED:")
        for r in results:
            if not r.passed:
                print(f"  - {r.name}: {r.errors}")
        return False

if __name__ == "__main__":
    success = run_test_suite()
    sys.exit(0 if success else 1)
