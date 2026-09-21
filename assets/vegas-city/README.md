# Las Vegas Editable City — GitHub-safe volumes

These volumes are the lossless split form of the two original editable-city ZIP archives. Every volume is below GitHub's regular 100 MB per-file limit.

## Part 1

Place all five files in this directory:

- Las_Vegas_Editable_City_Part_1_GitHub.z01 — 94,371,840 bytes
- Las_Vegas_Editable_City_Part_1_GitHub.z02 — 94,371,840 bytes
- Las_Vegas_Editable_City_Part_1_GitHub.z03 — 94,371,840 bytes
- Las_Vegas_Editable_City_Part_1_GitHub.z04 — 94,371,840 bytes
- Las_Vegas_Editable_City_Part_1_GitHub.zip — 92,643,694 bytes

## Part 2

Place all four files in this directory:

- Las_Vegas_Editable_City_Part_2_GitHub.z01 — 94,371,840 bytes
- Las_Vegas_Editable_City_Part_2_GitHub.z02 — 94,371,840 bytes
- Las_Vegas_Editable_City_Part_2_GitHub.z03 — 94,371,840 bytes
- Las_Vegas_Editable_City_Part_2_GitHub.zip — 21,297,984 bytes

## Reassemble / extract

The .z01/.z02/... files and final .zip are split ZIP volumes. Keep every volume of a part together.

On macOS/Linux with 7-Zip:

```bash
7z x Las_Vegas_Editable_City_Part_1_GitHub.zip
7z x Las_Vegas_Editable_City_Part_2_GitHub.zip
```

Verify each volume against `SHA256SUMS.txt` before extraction.
