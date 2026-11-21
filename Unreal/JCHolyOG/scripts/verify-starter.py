#!/usr/bin/env python3
"""Static source/config sanity check only; does not compile or package Unreal."""
from pathlib import Path
import json

base = Path(__file__).resolve().parents[1]
project = json.loads((base / "JCHolyOG.uproject").read_text())
assert project["EngineAssociation"] == "5.8"
assert any(m["Name"] == "JCHolyOG" for m in project["Modules"])
code = (base / "Source/JCHolyOG/Private/JCHeroCharacter.cpp").read_text()
overlay = (base / "Source/JCHolyOG/Private/JCAbilityOverlay.cpp").read_text()
inputs = (base / "Config/DefaultInput.ini").read_text()
renderer = (base / "Config/DefaultEngine.ini").read_text()
for name in ("ToggleFlight", "SetBoostHeld", "SetAscendHeld", "SetDescendHeld", "CastLightning"):
    assert name in code, name
for text in ("FlightClicked", "BoostPressed", "UpPressed", "DownPressed", "LightningClicked"):
    assert text in overlay, text
for text in ("DefaultVirtualJoysticks", "Gamepad_LeftX", "Gamepad_RightX"):
    assert text in inputs, text
assert "r.Mobile.ShadingPath=0" in renderer
assert "BundleIdentifier=" in renderer and "PackageName=" in renderer
print("Unreal PC/Android/iOS foundation: static source/config checks passed (not engine compiled).")
