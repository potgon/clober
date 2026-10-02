"""Global push-to-talk hotkey (hold to record) with pynput, no admin rights needed."""

from __future__ import annotations

from collections.abc import Callable
from typing import Literal

from pynput import keyboard

_ALIASES = {
    keyboard.Key.ctrl: "ctrl",
    keyboard.Key.ctrl_l: "ctrl",
    keyboard.Key.ctrl_r: "ctrl",
    keyboard.Key.shift: "shift",
    keyboard.Key.shift_l: "shift",
    keyboard.Key.shift_r: "shift",
    keyboard.Key.alt: "alt",
    keyboard.Key.alt_l: "alt",
    keyboard.Key.alt_r: "alt",
    keyboard.Key.alt_gr: "alt",
    keyboard.Key.cmd: "win",
    keyboard.Key.cmd_l: "win",
    keyboard.Key.cmd_r: "win",
}


def parse_hotkey(spec: str) -> frozenset[str]:
    """'ctrl+shift+space' -> {'ctrl', 'shift', 'space'}."""
    keys = frozenset(part.strip().lower() for part in spec.split("+") if part.strip())
    if not keys:
        raise ValueError(f"empty hotkey: {spec!r}")
    return keys


def key_name(key: keyboard.Key | keyboard.KeyCode | None) -> str | None:
    """Canonical lowercase name of a pynput key, matching `parse_hotkey` names."""
    if key is None:
        return None
    if key in _ALIASES:
        return _ALIASES[key]
    if isinstance(key, keyboard.Key):
        return key.name
    # With ctrl held, `char` becomes a control character, so prefer the virtual key.
    if key.vk is not None and (0x30 <= key.vk <= 0x39 or 0x41 <= key.vk <= 0x5A):
        return chr(key.vk).lower()
    return key.char.lower() if key.char else None


class HotkeyTracker:
    """Pure state machine: turns key presses and releases into hotkey down/up."""

    def __init__(self, keys: frozenset[str]) -> None:
        self.keys = keys
        self.active = False
        self._pressed: set[str] = set()

    def press(self, name: str) -> Literal["down"] | None:
        self._pressed.add(name)
        if not self.active and self.keys <= self._pressed:
            self.active = True
            return "down"
        return None

    def release(self, name: str) -> Literal["up"] | None:
        self._pressed.discard(name)
        if self.active and name in self.keys:
            self.active = False
            return "up"
        return None


class PushToTalk:
    """Runs a global keyboard listener; callbacks fire on the listener thread."""

    def __init__(self, spec: str, on_down: Callable[[], None], on_up: Callable[[], None]) -> None:
        self._tracker = HotkeyTracker(parse_hotkey(spec))
        self._on_down = on_down
        self._on_up = on_up
        self._listener = keyboard.Listener(on_press=self._press, on_release=self._release)

    def _press(self, key: keyboard.Key | keyboard.KeyCode | None) -> None:
        name = key_name(key)
        if name and self._tracker.press(name) == "down":
            self._on_down()

    def _release(self, key: keyboard.Key | keyboard.KeyCode | None) -> None:
        name = key_name(key)
        if name and self._tracker.release(name) == "up":
            self._on_up()

    def start(self) -> None:
        self._listener.start()

    def stop(self) -> None:
        self._listener.stop()
