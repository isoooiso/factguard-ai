# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import collections.abc
import json


class FactGuard(gl.Contract):
    reports: TreeMap[str, str]
    report_ids: DynArray[str]

    def __init__(self):
        pass

    @staticmethod
    def _clip(text: str, limit: int) -> str:
        cleaned = (text or "").strip()
        if len(cleaned) <= limit:
            return cleaned
        return cleaned[:limit] + "…"

    @staticmethod
    def _to_string_list(value, limit: int = 4) -> list[str]:
        if not isinstance(value, list):
            return []
        result: list[str] = []
        for item in value[:limit]:
            result.append(str(item).strip())
        return [item for item in result if item]

    @staticmethod
    def _normalize_urls(items: collections.abc.Sequence[str]) -> list[str]:
        urls: list[str] = []
        for item in items:
            candidate = str(item).strip()
            if candidate:
                urls.append(candidate)
            if len(urls) >= 3:
                break
        return urls

    @staticmethod
    def _is_valid_payload(payload, allowed_urls: list[str]) -> bool:
        if not isinstance(payload, dict):
            return False

        verdict = payload.get("verdict")
        if verdict not in ("LIKELY_TRUE", "LIKELY_FALSE", "MIXED_OR_UNCLEAR"):
            return False

        confidence = payload.get("confidence")
        if not isinstance(confidence, int) or confidence < 0 or confidence > 100:
            return False

        for key in ("summary", "explanation"):
            if not isinstance(payload.get(key), str) or not payload.get(key).strip():
                return False

        for key in ("supporting_points", "counter_points", "cited_urls", "warnings"):
            if not isinstance(payload.get(key), list):
                return False

        allowed = {url: True for url in allowed_urls}
        for cited in payload.get("cited_urls", []):
            if not isinstance(cited, str):
                return False
            if cited not in allowed:
                return False

        return True

    @gl.public.write
    def submit_verification(
        self,
        report_id: str,
        content_type: str,
        claim: str,
        content_text: str,
        source_urls: collections.abc.Sequence[str],
        notes: str,
        include_visual_capture: bool,
        submitted_at: str,
    ) -> None:
        report_id = self._clip(report_id, 120)
        content_type = self._clip(content_type, 40)
        claim = self._clip(claim, 1200)
        content_text = self._clip(content_text, 7000)
        notes = self._clip(notes, 1200)
        submitted_at = self._clip(submitted_at, 80)
        normalized_urls = self._normalize_urls(source_urls)
        visual_enabled = include_visual_capture and len(normalized_urls) > 0

        if not report_id:
            raise gl.UserError("Report ID is required")
        if report_id in self.reports:
            raise gl.UserError("Report ID already exists")
        if len(claim) < 12:
            raise gl.UserError("Claim is too short")
        if len(content_text) < 30:
            raise gl.UserError("Source text is too short")

        def sanitize_result(result: dict, warnings_from_fetch: list[str]) -> dict:
            cited_urls = [url for url in self._to_string_list(result.get("cited_urls"), 3) if url in normalized_urls]
            warnings = self._to_string_list(result.get("warnings"), 5)
            warnings.extend(warnings_from_fetch)
            return {
                "verdict": str(result.get("verdict", "MIXED_OR_UNCLEAR")).strip(),
                "confidence": int(result.get("confidence", 50)),
                "summary": self._clip(str(result.get("summary", "The evidence was inconclusive.")), 240),
                "explanation": self._clip(str(result.get("explanation", "No detailed explanation was returned.")), 1600),
                "supporting_points": self._to_string_list(result.get("supporting_points"), 4),
                "counter_points": self._to_string_list(result.get("counter_points"), 4),
                "cited_urls": cited_urls,
                "warnings": warnings[:6],
            }

        def build_evidence_pack() -> dict:
            fetched_sources: list[dict] = []
            warnings: list[str] = []
            visual_summary = ""

            for url in normalized_urls:
                try:
                    response = gl.nondet.web.get(url)
                    if response.status_code >= 400:
                        warnings.append(f"Source unavailable: {url}")
                        continue

                    source_text = self._clip(response.body.decode("utf-8"), 3500)
                    extraction_prompt = f"""
You are extracting stable factual hints from a web source for a fact-checking smart contract.

URL: {url}
Content type: {content_type}
Page text:
{source_text}

Return JSON with this exact schema:
{{
  "headline": "short title or empty string",
  "key_points": ["fact 1", "fact 2", "fact 3"],
  "reliability_note": "short note about whether this looks like a primary, secondary, or weak source"
}}
Keep key_points concise and factual.
"""
                    extracted = gl.nondet.exec_prompt(extraction_prompt, response_format="json")
                    fetched_sources.append(
                        {
                            "url": url,
                            "headline": self._clip(str(extracted.get("headline", "")), 180),
                            "key_points": self._to_string_list(extracted.get("key_points"), 3),
                            "reliability_note": self._clip(str(extracted.get("reliability_note", "")), 240),
                        }
                    )
                except Exception:
                    warnings.append(f"Could not process source: {url}")

            if visual_enabled:
                try:
                    screenshot = gl.nondet.web.render(normalized_urls[0], mode="screenshot")
                    visual_result = gl.nondet.exec_prompt(
                        f"""
You are looking at a webpage screenshot that is being used in a fact-checking workflow.
Summarize the most relevant visible text or headline for claim verification.
Respond as JSON: {{"visual_summary": "..."}}
""",
                        images=[screenshot],
                        response_format="json",
                    )
                    visual_summary = self._clip(str(visual_result.get("visual_summary", "")), 220)
                except Exception:
                    warnings.append("Visual webpage capture failed")

            return {
                "claim": claim,
                "content_type": content_type,
                "content_text": content_text,
                "notes": notes,
                "sources": fetched_sources,
                "warnings": warnings,
                "visual_used": visual_enabled,
                "visual_summary": visual_summary,
            }

        def leader_fn():
            evidence_pack = build_evidence_pack()
            final_prompt = f"""
You are a rigorous misinformation analyst operating inside a GenLayer intelligent contract.

Your task is to decide whether the user's claim is likely true, likely false, or still unclear.
Be conservative. If the evidence is weak, mixed, or insufficient, choose MIXED_OR_UNCLEAR.

Claim:
{claim}

User-provided source text:
{content_text}

Evidence pack JSON:
{json.dumps(evidence_pack)}

Return JSON with this exact schema:
{{
  "verdict": "LIKELY_TRUE | LIKELY_FALSE | MIXED_OR_UNCLEAR",
  "confidence": 0,
  "summary": "one short summary",
  "explanation": "a compact explanation grounded in the evidence",
  "supporting_points": ["..."],
  "counter_points": ["..."],
  "cited_urls": ["subset of the provided URLs only"],
  "warnings": ["... optional warnings ..."]
}}

Rules:
- confidence must be an integer from 0 to 100
- summary should be short and plain
- cited_urls must be a subset of the provided URLs only
- do not invent sources
- mention uncertainty when the evidence is incomplete
"""
            result = gl.nondet.exec_prompt(final_prompt, response_format="json")
            return sanitize_result(result, evidence_pack["warnings"])

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False

            payload = leader_result.calldata
            if not self._is_valid_payload(payload, normalized_urls):
                return False

            evidence_pack = build_evidence_pack()
            review_prompt = f"""
You are validating another validator's fact-check output.

Claim:
{claim}

Evidence pack JSON:
{json.dumps(evidence_pack)}

Leader output JSON:
{json.dumps(payload)}

Accept the leader output only if:
1. the verdict is plausibly supported by the evidence pack,
2. the confidence is not obviously exaggerated,
3. cited_urls are valid,
4. the summary and explanation do not contradict the evidence.

Respond as JSON with this exact schema:
{{
  "accept": true,
  "approved_verdict": "LIKELY_TRUE | LIKELY_FALSE | MIXED_OR_UNCLEAR"
}}
"""
            review = gl.nondet.exec_prompt(review_prompt, response_format="json")
            return bool(review.get("accept", False)) and review.get("approved_verdict") == payload.get("verdict")

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        if not self._is_valid_payload(result, normalized_urls):
            raise gl.UserError("Verification result had an invalid schema")

        final_report = {
            "report_id": report_id,
            "content_type": content_type,
            "claim": claim,
            "input_excerpt": self._clip(content_text, 280),
            "verdict": result["verdict"],
            "confidence": result["confidence"],
            "summary": result["summary"],
            "explanation": result["explanation"],
            "supporting_points": result["supporting_points"],
            "counter_points": result["counter_points"],
            "cited_urls": result["cited_urls"],
            "warnings": result["warnings"],
            "method": "GenLayer consensus + web evidence + optional screenshot review",
            "created_at_hint": submitted_at,
            "visual_check_used": visual_enabled,
            "submitted_by": gl.message.sender_address.as_hex,
        }

        self.reports[report_id] = json.dumps(final_report)
        self.report_ids.append(report_id)

    @gl.public.view
    def get_report(self, report_id: str) -> str:
        return self.reports.get(report_id, "")

    @gl.public.view
    def get_total_reports(self) -> u32:
        return u32(len(self.report_ids))

    @gl.public.view
    def get_recent_reports(self, limit: u32) -> collections.abc.Sequence[str]:
        count = int(limit)
        if count <= 0:
            return []

        result: list[str] = []
        total = len(self.report_ids)
        start = total - count
        if start < 0:
            start = 0

        for index in range(total - 1, start - 1, -1):
            report_id = self.report_ids[index]
            result.append(self.reports[report_id])

        return result

    @gl.public.view
    def get_report_ids(self) -> collections.abc.Sequence[str]:
        return [report_id for report_id in self.report_ids]
