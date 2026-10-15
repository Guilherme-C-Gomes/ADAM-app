# Protótipo do ADAM Admin

Esta pasta é **documentação do design**. Nada aqui é importado pelo app: pode
abrir, mexer e fechar sem risco de quebrar o build.

| Arquivo | O que é |
|---|---|
| `manual.html` | **Comece por aqui.** O manual completo: o projeto, a identidade visual, o design system e como usar tudo isto. Abre em qualquer navegador. |
| `index.html` | O protótipo navegável. As 95 telas, clicáveis, com o movimento de verdade. |
| `telas/` | Os 96 SVGs, um por tela, com a geometria exata. |

## Como abrir

Clique duas vezes em `manual.html` ou em `index.html`. Não precisa de servidor,
de internet nem de instalar nada. As fontes vêm do Google Fonts quando há
internet, e o navegador cai para uma fonte de sistema quando não há.

## O protótipo é de verdade

Não é vídeo nem sequência de imagens. Os filtros filtram, a chamada marca
presença, o contador conta, o calendário seleciona e as transições têm a duração
e a curva que estão na tabela de movimento do manual. Para ver a variante de
movimento reduzido, ligue "reduzir movimento" no sistema e recarregue.

## De onde isto sai

Nenhuma tela foi desenhada à mão. Tudo é gerado por Python, e o mesmo gerador
produz os SVGs, o protótipo, o plugin do Figma e este manual. **Toda correção
vai para o gerador**, nunca para um arquivo solto daqui: corrigir um arquivo
conserta uma tela, corrigir o gerador conserta a classe do defeito nas 95.

O gerador está em `adam-fonte.zip`, na pasta do plugin do Figma.

## Dados

Todos os nomes de criança, telefones e números destas telas são **fictícios**, e
existem para isso. Nome real de criança não entra em design, seed, teste nem
captura de tela. A foto da criança é sempre silhueta.

## Perfis

Cada perfil abre o app na aba **Chamada** e tem a sua barra. Para ver um perfil
direto, sem passar pela abertura, abra `index.html` com o nome da tela depois
do `#`:

| Perfil | Endereço |
|---|---|
| ADM | `index.html#chAdm` |
| Coord. técnico | `index.html#chCoord` |
| Treinador | `index.html#chTreinador` |
| Professor | `index.html#chProf` |
| Secretaria | `index.html#chSec` |
