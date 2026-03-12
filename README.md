# Wix CSV Tools CLI Generator

A refactored, interactive CLI application for analyzing, validating, and fixing Wix CSV import/export sheets.
This was refactored from a collection of standalone scripts into a functional, categorized command-line utility.

## Installation
Ensure you have Node.js installed.
```bash
npm install
```

## Usage
Simply start the interactive generator menu:
```bash
npm start
```
or
```bash
node src/index.js
```

## Features

### 🔍 Analyzers
- **Analyze Images Count**: Counts missing images and identifies sample rows.
- **Compare Dropped Products**: Compares an originally uploaded CSV with a newly exported CSV to identify dropped products, image length limits, and SKU errors.

### 🛡️ Validators
- **Comprehensive Validate Wix CSV**: A single-pass scanner that checks:
  - Missing handles, names, prices.
  - Value limits: Handle length, name length (>80), description length (>8000), custom fields.
  - Option structures and allowed types (DROP_DOWN, COLOR).
  - Wix limit constraints (max 300 variants per product).
  - Parent-Child consistency (Ensures a Variant's option strings perfectly match its Parent Product's defined choices).

### 🛠️ Fixers
- **General Limits & Rules Fixer**: 
  - Truncates extra images (>15).
  - Cuts long names and descriptions to fit Wix limits.
  - Removes empty/zero discounts causing import errors.
  - Repairs duplicate Option names within the same product by appending an index.
  - Repairs duplicate SKUs across products.
- **Inject Missing Images (Full URL)**: Merges full CDN URLs back into an exported CSV that has lost its image bindings.

## Project Structure
- `src/index.js` - Main CLI menu entry point (powered by `inquirer`).
- `src/analyzers/` - Read-only scripts returning statistics about the CSVs.
- `src/validators/` - Scripts to warn about missing or malformed Wix structural data.
- `src/fixers/` - Mutative tools that repair CSV errors and generate new verified output files.
- `src/utils/csv.js` - Centralized barebones CSV array mapping system (built without 3rd-party libs to maintain custom robust mapping).
- `archive/` - Original standalone diagnostic scripts (legacy).
