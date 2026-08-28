# -*- coding: utf-8 -*-
"""
Gera uma versão de arquivo único de uma tela, com CSS e JS embutidos.

    python ferramentas/standalone.py index.html  dist/assinatura.html
    python ferramentas/standalone.py combos.html dist/combos.html

Serve para publicar em lugares que aceitam só um arquivo (e-mail, anexo,
hospedagem simples). Para o site normal e para o GitHub Pages não é preciso:
as telas funcionam direto do repositório.
"""
import io, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ler(caminho):
    with io.open(os.path.join(RAIZ, caminho), encoding="utf-8") as f:
        return f.read()


def embutir(html):
    """Troca <link rel=stylesheet href=local> e <script src=local> pelo conteúdo."""
    def css(m):
        href = m.group(1)
        if href.startswith("http"):
            return m.group(0)
        return "<style>\n" + ler(href).strip() + "\n</style>"

    def js(m):
        src = m.group(1)
        if src.startswith("http"):
            return m.group(0)
        corpo = ler(src).strip()
        # uma tag de fechamento dentro de um comentário encerraria o bloco cedo
        if "</scr" + "ipt>" in corpo:
            raise SystemExit("erro: %s contém uma tag de fechamento de script "
                             "e não pode ser embutido" % src)
        return "<script>\n" + corpo + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js, html)
    return html


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    origem, destino = sys.argv[1], sys.argv[2]

    saida = embutir(ler(origem))

    pasta = os.path.dirname(os.path.join(RAIZ, destino))
    if pasta and not os.path.isdir(pasta):
        os.makedirs(pasta)
    with io.open(os.path.join(RAIZ, destino), "w", encoding="utf-8", newline="\n") as f:
        f.write(saida)
    print("%s -> %s  (%d KB)" % (origem, destino, len(saida.encode("utf-8")) // 1024))


if __name__ == "__main__":
    main()
