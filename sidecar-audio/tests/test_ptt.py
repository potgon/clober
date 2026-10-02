import pytest
from pynput import keyboard

from clober_audio.ptt import HotkeyTracker, key_name, parse_hotkey


def test_parse_hotkey():
    assert parse_hotkey("Ctrl+Shift+Space") == {"ctrl", "shift", "space"}
    with pytest.raises(ValueError):
        parse_hotkey(" + ")


def test_key_names():
    assert key_name(keyboard.Key.ctrl_l) == "ctrl"
    assert key_name(keyboard.Key.shift_r) == "shift"
    assert key_name(keyboard.Key.space) == "space"
    assert key_name(keyboard.Key.f13) == "f13"
    # With ctrl held Windows reports a control char; the virtual key wins.
    assert key_name(keyboard.KeyCode(vk=0x4B, char="\x0b")) == "k"
    assert key_name(None) is None


def test_hold_and_release():
    t = HotkeyTracker(parse_hotkey("ctrl+shift+space"))
    assert t.press("ctrl") is None
    assert t.press("shift") is None
    assert t.press("space") == "down"
    assert t.press("space") is None  # key repeat while held
    assert t.release("shift") == "up"
    assert t.release("ctrl") is None
    assert t.release("space") is None


def test_unrelated_key_release_keeps_hotkey_down():
    t = HotkeyTracker(parse_hotkey("ctrl+space"))
    t.press("ctrl")
    t.press("space")
    t.press("a")
    assert t.release("a") is None
    assert t.active
