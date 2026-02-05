#!/usr/bin/env python3
"""
Guitar Model Lab - EXHAUSTIVE Dropdown Combination Tests
=========================================================

Tests ALL possible dropdown combinations:
- 12 scales × 8 patterns × 12 roots = 1,152 base combinations
- Plus 5 CAGED shapes for pentatonic scales = additional 960 combos
- Total: 2,112 potential combinations

Validates:
1. API returns valid response (not error)
2. ASCII tab has correct structure (6 strings, correct order)
3. Notes are within valid fret range (0-24)
4. Music theory accuracy where applicable

Run with: python3 tests/exhaustive_combination_tests.py
"""

import requests
import re
import sys
import time
from typing import Dict, List, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed

API_URL = "https://guitar-model-lab.onrender.com"

# All possible dropdown values
ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
SCALES = []  # Will be fetched from API
PATTERNS = []  # Will be fetched from API
CAGED_SHAPES = ['E', 'D', 'C', 'A', 'G']
TUNINGS = ['standard']  # Focus on standard tuning for exhaustive test

# Music theory reference
CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
STANDARD_TUNING = {'E': 40, 'A': 45, 'D': 50, 'G': 55, 'B': 59, 'e': 64}

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

# Known incompatible combinations
INCOMPATIBLE = {
    # 3nps requires 7-note scales
    ('pentatonic_minor', '3nps'),
    ('pentatonic_major', '3nps'),
    ('blues', '3nps'),  # 6-note scale
}

@dataclass
class TestResult:
    combo: str
    passed: bool
    errors: List[str]
    response_time: float

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

def get_scale_notes(root: str, scale: str) -> set:
    """Get all note names in a scale"""
    if scale not in SCALE_INTERVALS:
        return set()
    root_idx = CHROMATIC.index(root)
    return {CHROMATIC[(root_idx + i) % 12] for i in SCALE_INTERVALS[scale]}

def validate_tab_structure(tab: str) -> List[str]:
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

    # Check consistent line lengths
    lengths = [len(line) for line in lines]
    if len(set(lengths)) > 1:
        errors.append(f"Inconsistent line lengths: {set(lengths)}")

    return errors

def validate_fret_range(tab: str) -> List[str]:
    """Ensure all frets are within valid range (0-24)"""
    errors = []
    parsed = parse_tab(tab)

    for string, frets in parsed.items():
        for fret in frets:
            if fret < 0 or fret > 24:
                errors.append(f"Invalid fret {fret} on string {string}")

    return errors

def validate_scale_notes(tab: str, root: str, scale: str, pattern: str) -> List[str]:
    """Validate notes are in the selected scale (where applicable)"""
    errors = []

    # Skip validation for chord-based patterns
    if pattern in CHORD_BASED_PATTERNS:
        return []

    parsed = parse_tab(tab)
    scale_notes = get_scale_notes(root, scale)

    if not scale_notes:
        return []  # Unknown scale, skip validation

    wrong_notes = []
    for string, frets in parsed.items():
        for fret in frets:
            note = get_note_at_fret(string, fret)
            if note not in scale_notes:
                wrong_notes.append(f"{note}@{string}{fret}")

    if wrong_notes and len(wrong_notes) <= 5:
        errors.append(f"Notes outside scale: {wrong_notes}")
    elif wrong_notes:
        errors.append(f"Notes outside scale: {len(wrong_notes)} violations")

    return errors

def test_combination(root: str, scale: str, pattern: str, caged_shape: str = None) -> TestResult:
    """Test a single dropdown combination"""
    combo_name = f"{root}/{scale}/{pattern}"
    if caged_shape:
        combo_name += f"/{caged_shape}"

    errors = []
    start_time = time.time()

    # Check for known incompatible combinations
    if (scale, pattern) in INCOMPATIBLE:
        # Should return an error from API
        params = {'root': root, 'scale': scale, 'pattern': pattern, 'bars': 2}
        if caged_shape:
            params['caged_shape'] = caged_shape

        try:
            resp = requests.post(f"{API_URL}/generate-tab", json=params, timeout=30)
            elapsed = time.time() - start_time

            if resp.status_code == 400 or resp.status_code == 422:
                # Expected error for incompatible combo
                return TestResult(combo_name, True, ["Expected: Incompatible combo"], elapsed)
            else:
                # Unexpected success or different error
                return TestResult(combo_name, False, [f"Should fail but got {resp.status_code}"], elapsed)
        except Exception as e:
            elapsed = time.time() - start_time
            return TestResult(combo_name, False, [f"Exception: {e}"], elapsed)

    # Build params
    params = {
        'root': root,
        'scale': scale,
        'pattern': pattern,
        'bars': 2,
    }
    if caged_shape and 'pentatonic' in scale:
        params['caged_shape'] = caged_shape

    try:
        resp = requests.post(f"{API_URL}/generate-tab", json=params, timeout=30)
        elapsed = time.time() - start_time

        if resp.status_code != 200:
            error_detail = resp.json().get('detail', resp.text) if resp.text else f"Status {resp.status_code}"
            return TestResult(combo_name, False, [f"API error: {error_detail}"], elapsed)

        data = resp.json()
        tab = data.get('tab', '')

        if not tab:
            return TestResult(combo_name, False, ["Empty tab returned"], elapsed)

        # Validate structure
        errors.extend(validate_tab_structure(tab))

        # Validate fret range
        errors.extend(validate_fret_range(tab))

        # Validate scale notes (where applicable)
        errors.extend(validate_scale_notes(tab, root, scale, pattern))

        return TestResult(combo_name, len(errors) == 0, errors, elapsed)

    except requests.exceptions.Timeout:
        elapsed = time.time() - start_time
        return TestResult(combo_name, False, ["Request timeout"], elapsed)
    except Exception as e:
        elapsed = time.time() - start_time
        return TestResult(combo_name, False, [f"Exception: {e}"], elapsed)

def fetch_api_options():
    """Fetch available options from API"""
    global SCALES, PATTERNS

    try:
        scales_resp = requests.get(f"{API_URL}/scales", timeout=10)
        patterns_resp = requests.get(f"{API_URL}/patterns", timeout=10)

        SCALES = scales_resp.json().get('scales', [])
        PATTERNS = patterns_resp.json().get('patterns', [])

        print(f"Fetched {len(SCALES)} scales: {SCALES}")
        print(f"Fetched {len(PATTERNS)} patterns: {PATTERNS}")

    except Exception as e:
        print(f"Failed to fetch API options: {e}")
        sys.exit(1)

def run_exhaustive_tests():
    """Run all combination tests"""
    print("=" * 70)
    print("GUITAR MODEL LAB - EXHAUSTIVE COMBINATION TESTS")
    print("=" * 70)

    # Fetch options
    fetch_api_options()

    # Build all test combinations
    combinations = []

    # Non-pentatonic: root × scale × pattern
    for root in ROOTS:
        for scale in SCALES:
            for pattern in PATTERNS:
                if 'pentatonic' not in scale:
                    combinations.append((root, scale, pattern, None))

    # Pentatonic: root × scale × pattern × caged_shape
    for root in ROOTS:
        for scale in SCALES:
            if 'pentatonic' in scale:
                for pattern in PATTERNS:
                    for caged in CAGED_SHAPES:
                        combinations.append((root, scale, pattern, caged))

    total = len(combinations)
    print(f"\nTotal combinations to test: {total}")
    print("-" * 70)

    results = []
    passed = 0
    failed = 0

    # Run tests with progress reporting
    batch_size = 50
    for i in range(0, total, batch_size):
        batch = combinations[i:i+batch_size]
        batch_results = []

        # Use thread pool for parallel requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {
                executor.submit(test_combination, *combo): combo
                for combo in batch
            }

            for future in as_completed(futures):
                result = future.result()
                batch_results.append(result)

                if result.passed:
                    passed += 1
                else:
                    failed += 1
                    # Print failures immediately
                    print(f"❌ {result.combo}: {result.errors[0] if result.errors else 'Unknown'}")

        results.extend(batch_results)

        # Progress update
        completed = min(i + batch_size, total)
        pct = (completed / total) * 100
        print(f"Progress: {completed}/{total} ({pct:.1f}%) - Passed: {passed}, Failed: {failed}")

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"\nTotal: {total} combinations tested")
    print(f"Passed: {passed} ({100*passed/total:.1f}%)")
    print(f"Failed: {failed} ({100*failed/total:.1f}%)")

    # Group failures by type
    if failed > 0:
        print("\n" + "-" * 70)
        print("FAILURE ANALYSIS")
        print("-" * 70)

        failure_types = {}
        for r in results:
            if not r.passed:
                error_type = r.errors[0].split(':')[0] if r.errors else 'Unknown'
                if error_type not in failure_types:
                    failure_types[error_type] = []
                failure_types[error_type].append(r.combo)

        for error_type, combos in sorted(failure_types.items(), key=lambda x: -len(x[1])):
            print(f"\n{error_type}: {len(combos)} failures")
            for combo in combos[:5]:  # Show first 5 examples
                print(f"  - {combo}")
            if len(combos) > 5:
                print(f"  ... and {len(combos) - 5} more")

    # Performance stats
    avg_time = sum(r.response_time for r in results) / len(results) if results else 0
    max_time = max(r.response_time for r in results) if results else 0
    print(f"\nPerformance: avg={avg_time:.2f}s, max={max_time:.2f}s")

    if failed == 0:
        print("\n✅ ALL COMBINATIONS PASSED!")
        return True
    else:
        print(f"\n⚠️ {failed} COMBINATIONS FAILED")
        return False

if __name__ == "__main__":
    success = run_exhaustive_tests()
    sys.exit(0 if success else 1)
