# Elige include/config.h si el estudiante ya lo copió.
# Si no existe, el firmware compila con config.example.h.
# No usamos __has_include("config.h"): el toolchain del ESP32 trae otro
# archivo con ese nombre y el compilador lo encuentra primero.
#
# Un config.h viejo puede declarar BRILLO_MAX como constexpr, no como macro.
# El firmware solo pone el default con #ifndef, así que si ve la variable
# avisa con ATIENDETE_BRILLO_YA_DECLARADO para no pisarla.

Import("env")
import os
import re


def quitar_comentarios(texto):
    texto = re.sub(r"/\*.*?\*/", "", texto, flags=re.S)
    texto = re.sub(r"//.*?$", "", texto, flags=re.M)
    return texto


raiz = env.subst("$PROJECT_DIR")
config = os.path.join(raiz, "include", "config.h")
ejemplo = os.path.join(raiz, "include", "config.example.h")

if os.path.isfile(config):
    env.Append(CPPDEFINES=["ATIENDETE_USA_CONFIG"])
    fuente = config
else:
    fuente = ejemplo

with open(fuente, encoding="utf-8") as archivo:
    texto = quitar_comentarios(archivo.read())

es_macro = re.search(r"^\s*#\s*define\s+BRILLO_MAX\b", texto, flags=re.M)
es_variable = re.search(r"\bBRILLO_MAX\s*(\{|=)", texto)
if es_variable and not es_macro:
    env.Append(CPPDEFINES=["ATIENDETE_BRILLO_YA_DECLARADO"])
