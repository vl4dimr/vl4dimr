# Milton Vladimir Mamani-Calisaya

Universidad Nacional del Altiplano, Puno, Perú
[ORCID 0000-0002-0676-0989](https://orcid.org/0000-0002-0676-0989)

I build reproducible research software. Most of what is here are **replication
packages**: the code, the data I am allowed to redistribute, and the exact results
behind a paper — published so that someone else can run them and get the same numbers.

My work sits in four areas: the quantitative study of science and research evaluation
in Peru, computational archaeology in the Andean highlands, the empirical analysis of
public policy, and applied machine learning.

---

## Science studies and research evaluation

How Peru's national researcher registry (RENACYT) holds up when measured against an
open bibliographic database, and how to do that measurement honestly.

| Repository | What it is |
|---|---|
| [renacyt-certification-ladder](https://github.com/vl4dimr/renacyt-certification-ladder) | Rung-by-rung audit of RENACYT's ranking levels against OpenAlex |
| [renacyt-field-coverage](https://github.com/vl4dimr/renacyt-field-coverage) | Field-level coverage of the registry against OpenAlex |
| [renacyt-openalex-ai-peru](https://github.com/vl4dimr/renacyt-openalex-ai-peru) | Mapping Peru's certified and uncertified AI research workforce |
| [hispanic-name-linkage](https://github.com/vl4dimr/hispanic-name-linkage) | Three-tier linkage protocol for Hispanic compound surnames, with a 65,528-case synthetic benchmark |
| [human-llm-abstract-quality](https://github.com/vl4dimr/human-llm-abstract-quality) | Human and language-model annotations of the structural quality of thesis abstracts |

## Computational archaeology

Visibility and symmetry in the Andean landscape and its material culture — with an
emphasis on the failure modes of the methods themselves.

| Repository | What it is |
|---|---|
| [silent-failures-viewshed](https://github.com/vl4dimr/silent-failures-viewshed) | A defect-injectable line-of-sight engine and a benchmark audited by mutation analysis: which visibility errors produce plausible but wrong results |
| [intervisibilidad-chucuito](https://github.com/vl4dimr/intervisibilidad-chucuito) | Intervisibility of archaeological sites in Chucuito on Copernicus DEM GLO-30, tested against three null models |
| [simetria-textil-andina](https://github.com/vl4dimr/simetria-textil-andina) | Symmetry-group analysis of 866 Andean textiles from open-access museum collections |

## Public policy and political economy

| Repository | What it is |
|---|---|
| [bunching-umbral-peru](https://github.com/vl4dimr/bunching-umbral-peru) | Bunching below Peru's public-tender threshold and its displacement, 2019–2024 (OCDS) |
| [automation-repression-latam](https://github.com/vl4dimr/automation-repression-latam) | Automation and repression: panel evidence from 18 Latin American countries |

## Applied machine learning

| Repository | What it is |
|---|---|
| [sleep-staging-temporal-context](https://github.com/vl4dimr/sleep-staging-temporal-context) | Subject-disjoint evaluation of compact sleep-staging models on Sleep-EDF-78, with explicit fold definitions and per-fold results |

## Teaching

| Repository | Course |
|---|---|
| [ic-2muestras-shiny](https://github.com/vl4dimr/ic-2muestras-shiny) | Biostatistics — MSc in Public Health, EPG-UNAP |
| [SOFTII](https://github.com/vl4dimr/SOFTII) | Software Engineering II — FastAPI, PostgreSQL, JWT, React |

---

## How these repositories are built

The same conventions apply across all of them, because the point is that someone else
can re-run the analysis and get my numbers:

- **A fixed seed and pinned dependency versions.** `requirements.txt` carries exact
  versions, not ranges.
- **Provenance for every input file.** A manifest records the SHA-256 of each raw file,
  so you can verify you are analysing the same bytes I did.
- **Failing loudly instead of imputing.** If an input is missing or malformed, the
  pipeline stops. It never fills a gap with a default and carries on.
- **Methodological decisions in a config file**, each with its default documented and
  its alternative named — so a reader can see what was chosen and change it.
- **Tests against published references.** Estimators are checked against established
  implementations and against worked examples from the literature, not only against
  themselves.
- **Honest licensing.** Code and data are licensed separately, and material I do not
  hold the rights to is not redistributed — persistent identifiers are given instead
  so the original can be retrieved from its source.

Several of these packages document the errors found along the way, including the ones
that produced plausible but wrong results before they were caught. That is deliberate:
a negative result that is reproducible is worth more than a clean one that is not.

---

**Contact** — [ORCID](https://orcid.org/0000-0002-0676-0989) ·
Universidad Nacional del Altiplano, Puno, Perú
