// ============================================================================
// Proposal PDF Renderer
// v1.82.0
//
// Generates a branded PDF from a Proposal record using @react-pdf/renderer.
// Mirrors the section structure of /proposal/[token] presentation page.
// Runs server-side only (renderToBuffer).
// ============================================================================

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { Proposal, ScopeItem, Deliverable, TimelinePhase, RunningCostItem } from '@/lib/proposalTypes';

// ── Styles ───────────────────────────────────────────────────────────────────

const colors = {
  bg: '#0d0e13',
  pageBg: '#ffffff',
  text: '#1a1a2e',
  textSecondary: '#4a4a6a',
  textMuted: '#8888a8',
  accent: '#4f46e5',
  accentLight: '#eef2ff',
  border: '#e5e5ee',
  borderLight: '#f0f0f5',
  white: '#ffffff',
  red: '#dc2626',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.pageBg,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 55,
  },
  // Cover page
  coverPage: {
    fontFamily: 'Helvetica',
    backgroundColor: colors.pageBg,
    paddingHorizontal: 55,
    paddingTop: 120,
    paddingBottom: 60,
    justifyContent: 'flex-start',
  },
  brand: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 3,
    color: colors.accent,
    marginBottom: 40,
    textTransform: 'uppercase' as const,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
    marginBottom: 50,
    lineHeight: 1.3,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 30,
  },
  metaItem: {
    width: 140,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10,
    color: colors.text,
  },
  metaSub: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 1,
  },
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  sectionNumber: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.accent,
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: colors.textSecondary,
  },
  // Scope / deliverables
  itemRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.accentLight,
  },
  itemLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.5,
  },
  // Deliverable cards
  deliverableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deliverableCard: {
    width: '48%',
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 4,
    backgroundColor: colors.accentLight,
  },
  // Timeline
  phaseRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.accentLight,
  },
  phaseName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },
  phaseDuration: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.accent,
    marginLeft: 8,
  },
  phaseDesc: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 1.5,
    marginTop: 2,
  },
  // Investment
  investCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  investHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  investLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  investPrice: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },
  investGrid: {
    flexDirection: 'row',
    padding: 14,
    gap: 20,
  },
  investCol: {
    flex: 1,
  },
  investAmount: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.accent,
  },
  investAmountBalance: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },
  investNote: {
    fontSize: 7,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Running costs
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  costName: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  costRelevance: {
    fontSize: 7,
    color: colors.textMuted,
  },
  costAmount: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.textSecondary,
  },
  // Lists
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingRight: 20,
  },
  bullet: {
    width: 12,
    fontSize: 10,
    color: colors.accent,
  },
  bulletRed: {
    width: 12,
    fontSize: 10,
    color: colors.red,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 1.5,
  },
  // Numbered list
  numberedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  numberCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.accent,
  },
  numberedContent: {
    flex: 1,
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 1.5,
    paddingTop: 2,
  },
  // Acceptance
  acceptanceBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 20,
    alignItems: 'center',
  },
  acceptanceText: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 360,
    marginBottom: 16,
  },
  signatureGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    width: '100%',
    maxWidth: 360,
  },
  signatureField: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  signatureLine: {
    height: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 55,
    right: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: colors.accent,
    textTransform: 'uppercase' as const,
  },
  footerRight: {
    fontSize: 7,
    color: colors.textMuted,
    textAlign: 'right',
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtCurrency(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return `€${Number(n).toLocaleString('en-IE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ── Section wrapper ──────────────────────────────────────────────────────────

function SectionBlock({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section} wrap={false}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionNumber}>{String(number).padStart(2, '0')}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// Wrappable section for long content
function SectionBlockWrap({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionNumber}>{String(number).padStart(2, '0')}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerBrand}>OTwoOne</Text>
      <Text style={s.footerRight}>hello@otwoone.ie · Cork, Ireland</Text>
    </View>
  );
}

// ── Document ─────────────────────────────────────────────────────────────────

function ProposalDocument({ proposal: p }: { proposal: Proposal }) {
  const hasRunningCosts = Array.isArray(p.running_costs) && p.running_costs.length > 0;
  let sectionNum = 0;

  return (
    <Document
      title={p.title || 'Proposal'}
      author="OTwoOne"
      subject={`Proposal for ${p.client_company || p.client_name || 'Client'}`}
    >
      {/* ── Cover Page ──────────────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        <Text style={s.brand}>OTwoOne</Text>
        <Text style={s.coverTitle}>{p.title || 'Project Proposal'}</Text>

        <View style={s.metaGrid}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Prepared for</Text>
            <Text style={s.metaValue}>{p.prepared_for || p.client_name || '—'}</Text>
            {p.client_company && <Text style={s.metaSub}>{p.client_company}</Text>}
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Prepared by</Text>
            <Text style={s.metaValue}>{p.prepared_by || 'OTwoOne'}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaValue}>{fmtDate(p.proposal_date)}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Valid until</Text>
            <Text style={s.metaValue}>{fmtDate(p.valid_until)}</Text>
          </View>
        </View>

        <PageFooter />
      </Page>

      {/* ── Content Pages ──────────────────────────────────────────────── */}
      <Page size="A4" style={s.page} wrap>
        <PageFooter />

        {/* Executive Summary */}
        {p.executive_summary && (
          <SectionBlock number={++sectionNum} title="Executive Summary">
            <Text style={s.bodyText}>{p.executive_summary}</Text>
          </SectionBlock>
        )}

        {/* Understanding Your Needs */}
        {p.problem_statement && (
          <SectionBlock number={++sectionNum} title="Understanding Your Needs">
            <Text style={s.bodyText}>{p.problem_statement}</Text>
          </SectionBlock>
        )}

        {/* Recommended Solution */}
        {p.recommended_solution && (
          <SectionBlock number={++sectionNum} title="Recommended Solution">
            <Text style={s.bodyText}>{p.recommended_solution}</Text>
          </SectionBlock>
        )}

        {/* Scope of Work */}
        {p.scope_items.length > 0 && (
          <SectionBlockWrap number={++sectionNum} title="Scope of Work">
            {(p.scope_items as ScopeItem[]).map((item, i) => (
              <View key={i} style={s.itemRow}>
                <View>
                  <Text style={s.itemLabel}>{item.label}</Text>
                  {item.description && <Text style={s.itemDesc}>{item.description}</Text>}
                </View>
              </View>
            ))}
          </SectionBlockWrap>
        )}

        {/* Deliverables */}
        {p.deliverables.length > 0 && (
          <SectionBlockWrap number={++sectionNum} title="Deliverables">
            <View style={s.deliverableGrid}>
              {(p.deliverables as Deliverable[]).map((d, i) => (
                <View key={i} style={s.deliverableCard}>
                  <Text style={s.itemLabel}>{d.label}</Text>
                  {d.description && <Text style={s.itemDesc}>{d.description}</Text>}
                </View>
              ))}
            </View>
          </SectionBlockWrap>
        )}

        {/* Delivery Timeline */}
        {(p.timeline_summary || p.timeline_phases.length > 0) && (
          <SectionBlockWrap number={++sectionNum} title="Delivery Timeline">
            {p.timeline_summary && (
              <Text style={[s.bodyText, { marginBottom: 10 }]}>{p.timeline_summary}</Text>
            )}
            {(p.timeline_phases as TimelinePhase[]).map((phase, i) => (
              <View key={i} style={s.phaseRow}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={s.phaseName}>{phase.phase}</Text>
                    <Text style={s.phaseDuration}>{phase.duration}</Text>
                  </View>
                  {phase.description && <Text style={s.phaseDesc}>{phase.description}</Text>}
                </View>
              </View>
            ))}
          </SectionBlockWrap>
        )}

        {/* Investment */}
        {p.build_price && (
          <SectionBlock number={++sectionNum} title="Investment">
            <View style={s.investCard}>
              <View style={s.investHeader}>
                <Text style={s.investLabel}>Project build</Text>
                <Text style={s.investPrice}>{fmtCurrency(p.build_price)}</Text>
              </View>
              <View style={s.investGrid}>
                <View style={s.investCol}>
                  <Text style={s.investLabel}>Deposit ({p.deposit_percent ?? 50}%)</Text>
                  <Text style={s.investAmount}>{fmtCurrency(p.deposit_amount)}</Text>
                  <Text style={s.investNote}>Due on acceptance</Text>
                </View>
                <View style={s.investCol}>
                  <Text style={s.investLabel}>Balance</Text>
                  <Text style={s.investAmountBalance}>{fmtCurrency(p.balance_amount)}</Text>
                  <Text style={s.investNote}>{p.balance_terms || 'Due on project completion'}</Text>
                </View>
              </View>
            </View>

            {/* Running costs */}
            {hasRunningCosts && (
              <View style={s.investCard}>
                <View style={s.investHeader}>
                  <Text style={s.investLabel}>Estimated ongoing costs (monthly)</Text>
                  <Text style={[s.itemDesc, { marginTop: 2 }]}>
                    Third-party service costs, separate from the project build.
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
                  {(p.running_costs as RunningCostItem[]).map((cost, i) => (
                    <View key={i} style={s.costRow}>
                      <View>
                        <Text style={s.costName}>{cost.name}</Text>
                        <Text style={s.costRelevance}>{cost.relevance}</Text>
                      </View>
                      <Text style={s.costAmount}>
                        {cost.low === cost.high
                          ? `${fmtCurrency(cost.low)}/mo`
                          : `${fmtCurrency(cost.low)} – ${fmtCurrency(cost.high)}/mo`}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </SectionBlock>
        )}

        {/* Assumptions */}
        {p.assumptions.length > 0 && (
          <SectionBlock number={++sectionNum} title="Assumptions">
            {(p.assumptions as string[]).map((a, i) => (
              <View key={i} style={s.bulletItem}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.bulletText}>{a}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* Exclusions */}
        {p.exclusions.length > 0 && (
          <SectionBlock number={++sectionNum} title="Exclusions">
            {(p.exclusions as string[]).map((e, i) => (
              <View key={i} style={s.bulletItem}>
                <Text style={s.bulletRed}>•</Text>
                <Text style={s.bulletText}>{e}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* Next Steps */}
        {p.next_steps.length > 0 && (
          <SectionBlock number={++sectionNum} title="Next Steps">
            {(p.next_steps as string[]).map((step, i) => (
              <View key={i} style={s.numberedItem}>
                <View style={s.numberCircle}>
                  <Text style={s.numberText}>{i + 1}</Text>
                </View>
                <Text style={s.numberedContent}>{step}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* Payment Terms */}
        {(p.payment_notes || p.balance_terms) && (
          <SectionBlock number={++sectionNum} title="Payment Terms">
            {p.payment_notes && <Text style={s.bodyText}>{p.payment_notes}</Text>}
            {p.balance_terms && (!p.payment_notes || !p.payment_notes.includes(p.balance_terms)) && (
              <Text style={[s.bodyText, { marginTop: p.payment_notes ? 6 : 0 }]}>{p.balance_terms}</Text>
            )}
            <Text style={[s.bodyText, { marginTop: 6 }]}>
              All prices are quoted in Euro (EUR) and are exclusive of VAT where applicable.
            </Text>
          </SectionBlock>
        )}

        {/* Terms & Conditions */}
        <SectionBlockWrap number={++sectionNum} title="Terms &amp; Conditions">
          <Text style={s.bodyText}>
            This proposal is valid until {fmtDate(p.valid_until)}.
            Acceptance of this proposal constitutes agreement to the terms outlined herein.
          </Text>
          <Text style={[s.bodyText, { marginTop: 6 }]}>
            Intellectual property rights for all work produced transfer to the client
            upon receipt of final payment. OTwoOne retains the right to reference the
            project in its portfolio unless otherwise agreed.
          </Text>
          <Text style={[s.bodyText, { marginTop: 6 }]}>
            Either party may terminate this agreement with 14 days written notice.
            Fees for completed work up to the termination date remain payable.
          </Text>
          <Text style={[s.bodyText, { marginTop: 6, fontSize: 8, color: colors.textMuted }]}>
            Full terms and conditions are available on request.
          </Text>
        </SectionBlockWrap>

        {/* Acceptance */}
        <SectionBlock number={++sectionNum} title="Acceptance">
          <View style={s.acceptanceBox}>
            <Text style={s.acceptanceText}>
              To accept this proposal, please sign below and return this document
              to OTwoOne. Upon acceptance, we will issue a deposit invoice and
              schedule your project kickoff.
            </Text>

            <View style={s.signatureGrid}>
              <View style={s.signatureField}>
                <Text style={s.signatureLabel}>Name</Text>
                <View style={s.signatureLine} />
              </View>
              <View style={s.signatureField}>
                <Text style={s.signatureLabel}>Company</Text>
                <View style={s.signatureLine} />
              </View>
              <View style={s.signatureField}>
                <Text style={s.signatureLabel}>Date</Text>
                <View style={s.signatureLine} />
              </View>
            </View>

            <View style={s.signatureGrid}>
              <View style={{ flex: 1 }}>
                <Text style={s.signatureLabel}>Signature</Text>
                <View style={[s.signatureLine, { height: 40 }]} />
              </View>
            </View>
          </View>
        </SectionBlock>
      </Page>
    </Document>
  );
}

// ── Server-side render ───────────────────────────────────────────────────────

export async function renderProposalPdf(proposal: Proposal): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <ProposalDocument proposal={proposal} />,
  );
  return Buffer.from(buffer);
}
