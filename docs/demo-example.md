# Synthetic demo guide

This example is a hand-authored, fictional four-sentence lesson announcement translated from English into Spanish. It demonstrates a review workflow using fixed text and prewritten reviewer responses. It is not a real customer run, a model benchmark, or an accuracy evaluation.

## Intentional meaning changes

The initial translation includes three errors that a fluent surface reading could miss:

| Source meaning | Flawed translation | Intended correction |
| --- | --- | --- |
| The stated day is Friday. | The day becomes Thursday. | Restore Friday. |
| Subtitles are available in three languages. | The count becomes two. | Restore three languages. |
| No account is required. | An account becomes required. | Restore access without an account. |

The revised translation restores these facts. The example also provides a place to discuss naturalness and tone without equating fluent writing with faithful meaning.

## Walkthrough

1. Run `npm start` with Node.js 22 or newer and open the local address printed by the server. No dependency installation or environment file is needed.
2. Read the source and the **Translation** sample. Select **Check sample** to reveal the fixture assessment.
3. Compare the findings from **Reviewer A**, **Reviewer B**, and **Reviewer C**. Their responses are written in advance to illustrate independent perspectives and disagreement.
4. Select **Show revised sample**, review the **Revision** tab, and select **Check sample** again.
5. Compare both versions and their most recent mock assessments during this session. Select **Reset example** to clear both assessments and start again.

Use `npm test` to verify the deterministic demo logic.

## How to interpret the result

All ratings and findings are synthetic fixtures. A higher revised rating illustrates the intended correction-and-reassessment experience; it is not evidence that any particular model or production system achieved that result.

The educational evaluation policy is visible in `demo/evaluation.mjs`. Its aggregation and disagreement rules belong to this demonstration, not to private production calibration. Three generic reviewer adapters illustrate the role of independent multi-model review without representing live model responses.

The local showcase uses a fixed example and does not accept pasted text or uploads. To explore the working product, use the [live demo](https://multigate.downlds.app/); live AI checks may require sign-in.

The README screenshots show this local synthetic showcase before and after revision. They are not screenshots of customer content or production assessments.
