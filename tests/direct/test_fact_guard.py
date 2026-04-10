import json


def test_submit_and_read_report(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy('contracts/fact_guard.py')
    direct_vm.sender = direct_alice

    direct_vm.mock_web(
        r'https://example\.com/source-1',
        {
            'status': 200,
            'body': 'Official publication states the proposal was not adopted by parliament.',
        },
    )

    direct_vm.mock_llm(
        r'.*extracting stable factual hints.*',
        json.dumps(
            {
                'headline': 'Official publication',
                'key_points': ['Proposal not adopted', 'Statement is official'],
                'reliability_note': 'Looks like a primary source',
            }
        ),
    )

    direct_vm.mock_llm(
        r'.*webpage screenshot.*',
        json.dumps({'visual_summary': 'Headline says proposal was not adopted'}),
    )

    direct_vm.mock_llm(
        r'.*rigorous misinformation analyst.*',
        json.dumps(
            {
                'verdict': 'LIKELY_FALSE',
                'confidence': 86,
                'summary': 'The claim is contradicted by the provided official source.',
                'explanation': 'The source text and extracted source summary both indicate the proposal was not adopted.',
                'supporting_points': ['Official source contradicts the claim'],
                'counter_points': ['Only one source was provided'],
                'cited_urls': ['https://example.com/source-1'],
                'warnings': [],
            }
        ),
    )

    direct_vm.mock_llm(
        r'.*validating another validator.*',
        json.dumps({'accept': True, 'approved_verdict': 'LIKELY_FALSE'}),
    )

    contract.submit_verification(
        'report-1',
        'article',
        'The proposal was passed yesterday.',
        'This article claims the proposal was passed yesterday.',
        ['https://example.com/source-1'],
        'Focus on the legal status.',
        True,
        '2026-04-08T10:00:00Z',
    )

    raw_report = contract.get_report('report-1')
    report = json.loads(raw_report)

    assert report['verdict'] == 'LIKELY_FALSE'
    assert report['confidence'] == 86
    assert report['visual_check_used'] is True
    assert report['cited_urls'] == ['https://example.com/source-1']
    assert contract.get_total_reports() == 1


def test_recent_reports_order(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy('contracts/fact_guard.py')
    direct_vm.sender = direct_alice

    direct_vm.mock_llm(
        r'.*rigorous misinformation analyst.*',
        json.dumps(
            {
                'verdict': 'MIXED_OR_UNCLEAR',
                'confidence': 44,
                'summary': 'Evidence is inconclusive.',
                'explanation': 'There are no external URLs, so the report remains uncertain.',
                'supporting_points': [],
                'counter_points': [],
                'cited_urls': [],
                'warnings': ['No external sources provided'],
            }
        ),
    )
    direct_vm.mock_llm(
        r'.*validating another validator.*',
        json.dumps({'accept': True, 'approved_verdict': 'MIXED_OR_UNCLEAR'}),
    )

    contract.submit_verification(
        'report-a',
        'plain-text',
        'Claim A has no evidence.',
        'Some text that is long enough to pass the validator for testing purposes.',
        [],
        '',
        False,
        '2026-04-08T10:00:00Z',
    )
    contract.submit_verification(
        'report-b',
        'plain-text',
        'Claim B has no evidence.',
        'Some other text that is long enough to pass the validator for testing purposes.',
        [],
        '',
        False,
        '2026-04-08T10:01:00Z',
    )

    reports = contract.get_recent_reports(2)
    ids = [json.loads(item)['report_id'] for item in reports]
    assert ids == ['report-b', 'report-a']
