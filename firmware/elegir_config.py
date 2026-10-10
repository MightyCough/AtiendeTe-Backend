# Elige include/config.h si el estudiante ya lo copió.
# Si no existe, el firmware compila con config.example.h.
# No usamos __has_include("config.h"): el toolchain del ESP32 trae otro
# archivo con ese nombre y el compilador lo encuentra primero.

Import("env")
import os

ruta = os.path.join(env.subst("$PROJECT_DIR"), "include", "config.h")
if os.path.isfile(ruta):
    env.Append(CPPDEFINES=["ATIENDETE_USA_CONFIG"])
