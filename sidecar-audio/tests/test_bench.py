import pytest

from clober_audio.bench import ModelResult, choose_model, wer


def test_wer():
    assert wer("pon la escena juego", "Pon la escena juego.") == 0
    assert wer("pon la escena juego", "por la estena juego") == pytest.approx(0.5)
    assert wer("escena juego", "escena") == pytest.approx(0.5)
    assert wer("cámara", "camara") == 0
    assert wer("", "") == 0


def result(model: str, p50: float, error: float) -> ModelResult:
    return ModelResult(model, [p50] * 3, [error] * 3)


def test_choose_model_lowest_wer_under_600_ms():
    results = [result("tiny", 200, 0.3), result("base", 450, 0.1), result("small", 1500, 0.05)]
    assert choose_model(results) == "base"


def test_choose_model_prefers_larger_on_ties():
    assert choose_model([result("tiny", 200, 0.1), result("base", 500, 0.1)]) == "base"


def test_choose_model_falls_back_to_base():
    assert choose_model([result("small", 900, 0.0), result("medium", 2000, 0.0)]) == "base"
