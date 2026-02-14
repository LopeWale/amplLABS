import sys
import types


def _install_fake_amplpy() -> None:
    """Install a minimal fake amplpy module for unit tests."""
    if "amplpy" in sys.modules:
        return

    fake_module = types.ModuleType("amplpy")

    class Environment:  # pragma: no cover - simple compatibility shim
        def __init__(self, _path: str | None = None):
            self.path = _path

    class AMPL:  # pragma: no cover - exercised indirectly by route tests
        def __init__(self, *_args, **_kwargs):
            self._values = {"solve_result": "solved", "_niter": 0}

        def close(self):
            return None

        def setOption(self, *_args, **_kwargs):
            return None

        def eval(self, *_args, **_kwargs):
            return None

        def solve(self):
            return None

        def getOutput(self, _statement: str):
            return "ok"

        def getValue(self, key: str):
            return self._values.get(key)

        def getObjectives(self):
            return []

        def getVariables(self):
            return []

        def getConstraints(self):
            return []

        def getSets(self):
            return []

        def getParameters(self):
            return []

    fake_module.AMPL = AMPL
    fake_module.Environment = Environment
    sys.modules["amplpy"] = fake_module


_install_fake_amplpy()
