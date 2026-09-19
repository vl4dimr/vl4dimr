<div align="center">

# Milton Vladimir Mamani-Calisaya

### Research software engineer · Quantitative science studies

Universidad Nacional del Altiplano — Puno, Perú

[![ORCID](https://img.shields.io/badge/ORCID-0000--0002--0676--0989-A6CE39?style=for-the-badge&logo=orcid&logoColor=white)](https://orcid.org/0000-0002-0676-0989)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://github.com/vl4dimr?tab=repositories&language=python)
[![R](https://img.shields.io/badge/R-276DC3?style=for-the-badge&logo=r&logoColor=white)](https://github.com/vl4dimr?tab=repositories&language=r)
[![Open Science](https://img.shields.io/badge/Open_Science-CC_BY_4.0-orange?style=for-the-badge)](https://creativecommons.org/licenses/by/4.0/)

</div>

<div align="center">

### *I write the code, the data, and the errors — all three in public.*

</div>

---

Eleven research codebases, nearly all of them written and maintained single-handedly,
across four fields. Each one
ships the analysis that produced a paper's numbers: fixed seeds, pinned versions,
checksummed inputs, and pipelines that stop rather than guess. Several also ship the
mistakes I caught along the way — because a wrong result that looks right is the most
expensive thing in empirical work, and the only defence is showing your hand.

<div align="center">

**11** codebases · **4** fields · **65,528**-case benchmark · **866** textiles ·
**18** countries · **160** annotated abstracts

</div>

---

## Selected work

<table>
<tr><td width="55%">

<h3>
  <img src="assets/icons/viewshed-failure.svg" width="26" height="26" align="absmiddle" alt="">
  &nbsp;Silent failures in visibility analysis
</h3>
**Which GIS bugs produce results that look perfectly plausible?**

A line-of-sight engine you can inject defects into, a benchmark audited by mutation
analysis, and a synthetic landscape where ground truth is true by construction. NumPy
only — no black boxes.

[`silent-failures-viewshed`](https://github.com/vl4dimr/silent-failures-viewshed)

</td><td width="45%">

<h3>
  <img src="assets/icons/annotation-agreement.svg" width="26" height="26" align="absmiddle" alt="">
  &nbsp;Do models disagree like humans do?
</h3>
**Not whether an LLM annotates well — whether its disagreement is distinguishable from
a second human's.**

160 Spanish thesis abstracts, two independent human annotators, three open-weight
models × three runs, per-variable Δκ with paired bootstrap.

[`human-llm-abstract-quality`](https://github.com/vl4dimr/human-llm-abstract-quality)

</td></tr>
<tr><td>

<h3>
  <img src="assets/icons/registry-audit.svg" width="26" height="26" align="absmiddle" alt="">
  &nbsp;Auditing a national researcher registry
</h3>
**Peru certifies and ranks its researchers. Does the ranking survive contact with
OpenAlex?**

Three packages: a rung-by-rung audit of the ladder, field-level coverage, and a map of
the certified and uncertified AI workforce.

[`renacyt-certification-ladder`](https://github.com/vl4dimr/renacyt-certification-ladder) ·
[`renacyt-field-coverage`](https://github.com/vl4dimr/renacyt-field-coverage) ·
[`renacyt-openalex-ai-peru`](https://github.com/vl4dimr/renacyt-openalex-ai-peru)

</td><td>

<h3>
  <img src="assets/icons/name-linkage.svg" width="26" height="26" align="absmiddle" alt="">
  &nbsp;Matching Hispanic compound surnames
</h3>
**Every record-linkage tool built for "First Last" quietly fails on "Mamani-Calisaya".**

A three-tier protocol and a 65,528-case synthetic benchmark to prove it, and to measure
what it costs.

[`hispanic-name-linkage`](https://github.com/vl4dimr/hispanic-name-linkage)

</td></tr>
</table>

---

## Everything else

<details open>
<summary>
  <img src="assets/icons/section-science-studies.svg" width="20" height="20" align="absmiddle" alt="">
  &nbsp;<b>Science studies &amp; research evaluation</b>
</summary>
<br>

| Repository | Hook |
|---|---|
| [renacyt-certification-ladder](https://github.com/vl4dimr/renacyt-certification-ladder) | Does each rung of Peru's researcher ladder mean what it claims? |
| [renacyt-field-coverage](https://github.com/vl4dimr/renacyt-field-coverage) | Which fields does the national registry actually see? |
| [renacyt-openalex-ai-peru](https://github.com/vl4dimr/renacyt-openalex-ai-peru) | Peru's AI researchers — the certified ones and the invisible ones |
| [hispanic-name-linkage](https://github.com/vl4dimr/hispanic-name-linkage) | Record linkage that does not break on two surnames |
| [human-llm-abstract-quality](https://github.com/vl4dimr/human-llm-abstract-quality) | Human vs. model disagreement, measured against human vs. human |

</details>

<details open>
<summary>
  <img src="assets/icons/section-archaeology.svg" width="20" height="20" align="absmiddle" alt="">
  &nbsp;<b>Computational archaeology</b>
</summary>
<br>

| Repository | Hook |
|---|---|
| [silent-failures-viewshed](https://github.com/vl4dimr/silent-failures-viewshed) | Visibility bugs that pass every eye test and every reviewer |
| [intervisibilidad-chucuito](https://github.com/vl4dimr/intervisibilidad-chucuito) | Sightlines between Chucuito sites vs. three null models — with the counterexamples that exposed three artefacts |
| [simetria-textil-andina](https://github.com/vl4dimr/simetria-textil-andina) | Symmetry groups across 866 Andean textiles from open museum collections |

</details>

<details open>
<summary>
  <img src="assets/icons/section-policy.svg" width="20" height="20" align="absmiddle" alt="">
  &nbsp;<b>Public policy &amp; political economy</b>
</summary>
<br>

| Repository | Hook |
|---|---|
| [bunching-umbral-peru](https://github.com/vl4dimr/bunching-umbral-peru) | Contracts pile up just under Peru's tender threshold — and move when it moves |
| [automation-repression-latam](https://github.com/vl4dimr/automation-repression-latam) | Automation and repression across 18 Latin American countries |

</details>

<details open>
<summary>
  <img src="assets/icons/section-machine-learning.svg" width="20" height="20" align="absmiddle" alt="">
  &nbsp;<b>Applied machine learning</b>
</summary>
<br>

| Repository | Hook |
|---|---|
| [sleep-staging-temporal-context](https://github.com/vl4dimr/sleep-staging-temporal-context) | Compact sleep stagers on Sleep-EDF-78, scored subject-disjoint with published folds |

</details>

<details>
<summary>
  <img src="assets/icons/section-teaching.svg" width="20" height="20" align="absmiddle" alt="">
  &nbsp;<b>Teaching</b>
</summary>
<br>

| Repository | Course |
|---|---|
| [ic-2muestras-shiny](https://github.com/vl4dimr/ic-2muestras-shiny) | Biostatistics — MSc Public Health, EPG-UNAP |
| [SOFTII](https://github.com/vl4dimr/SOFTII) | Software Engineering II — FastAPI, PostgreSQL, JWT, React |

</details>

---

## How I build

> **Fail loudly, never impute.** A missing or malformed input stops the pipeline. No
> silent default, no carrying on with a hole in the data.

> **Every byte accounted for.** A manifest records the SHA-256 of each raw input, so you
> can prove you are analysing what I analysed.

> **Decisions are configuration, not folklore.** Every debatable methodological choice
> lives in a config file with its default documented and its alternative named.

> **Tested against the literature.** Estimators are checked against established
> implementations and worked examples from published papers — not against themselves.

> **Licensed honestly.** Code and data carry separate licences, and material I do not
> hold rights to is never redistributed: persistent identifiers point to the source
> instead.

---

<div align="center">

**Open to collaboration** on research software, reproducibility audits, and
quantitative science studies.

[![ORCID](https://img.shields.io/badge/ORCID-0000--0002--0676--0989-A6CE39?style=flat-square&logo=orcid&logoColor=white)](https://orcid.org/0000-0002-0676-0989)
[![Location](https://img.shields.io/badge/Puno-Perú-red?style=flat-square)](https://www.openstreetmap.org/#map=13/-15.8402/-70.0219)

</div>
