import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { resetStorage } from './setup';
import { signIn } from '../../src/lib/auth';
import { answersFor, applyPath, clearAllDrafts, deleteDraft, listDrafts, loadDraft, mergeAnswers, saveDraft } from '../../src/lib/drafts';
import { greeting, timeAgo } from '../../src/lib/format';
import { buildKitText, countAnswered } from '../../src/lib/kit';
import { profileCompletion, saveProfile, emptyProfile, demoProfile } from '../../src/lib/profile';
import { getSubmission, makeReference, saveSubmission } from '../../src/lib/submissionStore';
import { findProblems, isValidEmail, isValidPhone, parseStep, TOTAL_STEPS, validateAnswer, wizardSteps } from '../../src/lib/wizard';
import { findJob } from '../../src/data/jobs';
import { getWizardSteps } from '../../src/lib/wizard';

beforeEach(resetStorage);

const step = (key: string) => wizardSteps.find((s) => s.key === key)!;

describe('validation', () => {
  it('accepts and rejects phone numbers', () => {
    assert.ok(isValidPhone('98765 43210'));
    assert.ok(isValidPhone('+91 98765 43210'));
    assert.ok(!isValidPhone('12345'));
    assert.ok(!isValidPhone(''));
  });
  it('checks email shape', () => {
    assert.ok(isValidEmail('a@b.co'));
    assert.ok(!isValidEmail('nope'));
  });
  it('gives plain-language errors', () => {
    assert.equal(validateAnswer(step('phone'), ''), 'Please enter a phone number.');
    assert.match(validateAnswer(step('phone'), '123'), /10-digit/);
    assert.match(validateAnswer(step('why'), 'short'), /full sentence/);
    assert.equal(validateAnswer(step('support'), ''), '');
    assert.equal(validateAnswer(step('authorization'), 'Maybe'), 'Please choose one of the answers.');
  });
  it('lists every problem with its step number', () => {
    const problems = findProblems({ name: 'A', email: 'a@b.co', phone: '', resume: 'r.pdf', authorization: '', why: '', support: '' });
    assert.deepEqual(problems.map((p) => p.step), [3, 5, 6]);
  });
  it('parses step params strictly', () => {
    assert.equal(parseStep('1'), 1);
    assert.equal(parseStep(String(TOTAL_STEPS)), TOTAL_STEPS);
    assert.equal(parseStep('0'), null);
    assert.equal(parseStep(String(TOTAL_STEPS + 1)), null);
    assert.equal(parseStep('review'), null);
    assert.equal(parseStep('2abc'), null);
    assert.equal(parseStep(undefined), null);
  });
});

describe('drafts', () => {
  it('starts empty with no hard-coded personal data', () => {
    const a = answersFor('acme-data');
    assert.equal(a.name, '');
    assert.equal(a.why, '');
    assert.equal(a.authorization, '');
  });
  it('prefills from account and profile', () => {
    signIn({ email: 'x@example.com', name: 'X Person' });
    assert.equal(answersFor('acme-data').name, 'X Person');
    saveProfile({ ...emptyProfile, name: 'Profile Name', email: 'p@example.com', phone: '9876543210', resume: 'cv.pdf' });
    const a = answersFor('acme-data');
    assert.equal(a.name, 'Profile Name');
    assert.equal(a.resume, 'cv.pdf');
  });
  it('round-trips, lists newest first, resumes at saved step', () => {
    saveDraft({ jobId: 'a', step: 2, answers: { name: 'N' }, savedAt: '2026-01-01T00:00:00.000Z' });
    saveDraft({ jobId: 'b', step: 4, answers: { name: 'M' }, savedAt: '2026-02-01T00:00:00.000Z' });
    assert.deepEqual(listDrafts().map((d) => d.jobId), ['b', 'a']);
    assert.equal(applyPath('b'), '/apply/b/4');
    assert.equal(applyPath('zzz'), '/apply/zzz/1');
    deleteDraft('b');
    assert.equal(loadDraft('b'), null);
    clearAllDrafts();
    assert.equal(listDrafts().length, 0);
  });
  it('clamps a corrupt step', () => {
    saveDraft({ jobId: 'a', step: 99, answers: {}, savedAt: new Date().toISOString() });
    assert.equal(loadDraft('a')!.step, TOTAL_STEPS);
  });
  it('an empty saved value does not wipe a profile default', () => {
    assert.equal(mergeAnswers({ resume: 'cv.pdf', why: '' }, { resume: '', why: 'because' }).resume, 'cv.pdf');
    assert.equal(mergeAnswers({ resume: 'cv.pdf', why: '' }, { resume: '', why: 'because' }).why, 'because');
  });
});

describe('submissions, profile, kit, format', () => {
  it('stores one submission per job', () => {
    saveSubmission({ jobId: 'a', reference: 'AE-1', submittedAt: 't', status: 'Submitted' });
    saveSubmission({ jobId: 'a', reference: 'AE-2', submittedAt: 't', status: 'Submitted' });
    assert.equal(getSubmission('a')!.reference, 'AE-2');
    assert.match(makeReference(new Date('2026-10-02T10:00:00Z')), /^AE-2026-\d{5}$/);
  });
  it('computes profile completion', () => {
    assert.equal(profileCompletion(emptyProfile).percent, 0);
    assert.equal(profileCompletion(demoProfile).ready, 4);
    assert.equal(profileCompletion({ ...demoProfile, experience: 'x' }).percent, 100);
  });
  it('builds a kit from real answers', () => {
    const job = findJob('acme-data')!;
    const text = buildKitText(job, { name: 'Asha', email: 'a@b.co', phone: '9876543210', resume: 'cv.pdf', why: 'I like data work.', authorization: 'Yes', support: '' });
    assert.match(text, /Candidate: Asha/);
    assert.match(text, /I like data work\./);
    assert.ok(!/Sadaf/.test(text));
    assert.equal(countAnswered({ name: 'a', email: '', why: 'x' }), 2);
  });
  it('formats time', () => {
    const now = Date.parse('2026-10-02T12:00:00Z');
    assert.equal(timeAgo('2026-10-02T11:59:50Z', now), 'just now');
    assert.equal(timeAgo('2026-10-02T11:55:00Z', now), '5 minutes ago');
    assert.equal(timeAgo('2026-10-02T10:00:00Z', now), '2 hours ago');
    assert.equal(timeAgo('2026-09-29T12:00:00Z', now), '3 days ago');
    assert.equal(greeting(new Date(2026, 9, 2, 9)), 'Good morning');
    assert.equal(greeting(new Date(2026, 9, 2, 20)), 'Good evening');
  });
});


describe('job schemas', () => {
  it('uses different question schemas and never prefills sensitive choices', () => {
    const acme = getWizardSteps(findJob('acme-data'));
    const northstar = getWizardSteps(findJob('northstar-ux'));
    assert.equal(acme.length, 7);
    assert.equal(northstar.length, 6);
    assert.notEqual(acme.map((s) => s.key).join(','), northstar.map((s) => s.key).join(','));
    assert.equal(northstar.find((s) => s.key === 'studentStatus')?.sensitive, true);
  });
});
