-- ============================================================================
-- Proposal Terms Engine
-- v1.83.0
--
-- Adds managed terms templates and links them to proposals for auditability.
-- ============================================================================

-- ── Terms templates table ──────────────────────────────────────────────────

create table if not exists proposal_terms_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  version     text not null,
  title       text not null default 'Terms & Conditions',
  body        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Only one active template at a time
create unique index if not exists uq_terms_one_active
  on proposal_terms_templates(is_active) where is_active = true;

-- Auto-update updated_at
create or replace trigger trg_terms_templates_updated_at
  before update on proposal_terms_templates
  for each row execute function set_updated_at();

-- ── Link proposals to terms ────────────────────────────────────────────────

alter table proposals
  add column if not exists terms_template_id uuid references proposal_terms_templates(id),
  add column if not exists terms_version text;

-- ── Seed default OTwoOne terms ─────────────────────────────────────────────

insert into proposal_terms_templates (name, version, title, body) values (
  'OTwoOne Standard Terms',
  '1.0',
  'Terms & Conditions',
  '1. Proposal Validity
This proposal is valid for the period stated on the cover page. After this date, pricing and availability may be subject to change. An extension can be arranged by contacting OTwoOne.

2. Acceptance & Commencement
The project will commence once the client has confirmed acceptance of this proposal in writing (email is acceptable) and the deposit payment has been received. OTwoOne will confirm receipt and schedule a project kickoff within 5 business days.

3. Payment Terms
The deposit amount stated in this proposal is due on acceptance. The balance is due as stated in the Investment section. All invoices are payable within 14 days of issue. Late payments may incur a delay to the project schedule. All prices are quoted in Euro and are exclusive of VAT where applicable.

4. Scope of Work
The project scope is limited to the items described in the Scope of Work and Deliverables sections of this proposal. Work outside this scope will be quoted separately and must be agreed in writing before commencement. OTwoOne will notify the client promptly if any requested change is likely to affect the timeline or cost.

5. Client Responsibilities
The client is responsible for providing content, feedback, and approvals within the timescales agreed at kickoff. Delays in client-side deliverables (content, images, access credentials, feedback) may result in corresponding delays to the project timeline. OTwoOne will not be held responsible for delays caused by late or incomplete client input.

6. Revisions & Feedback
The project includes a reasonable number of revision rounds as outlined in the scope. Additional revision rounds beyond what is included may be quoted as additional work. Feedback should be consolidated and provided in a single round per review stage to maintain project momentum.

7. Intellectual Property
All intellectual property rights for bespoke work produced under this proposal transfer to the client upon receipt of full and final payment. Until full payment is received, all work remains the property of OTwoOne. OTwoOne retains the right to reference the project in its portfolio and marketing materials unless otherwise agreed in writing.

8. Third-Party Services
Where the project involves third-party services (hosting, domains, APIs, software licences), these are subject to the respective provider''s own terms and pricing. OTwoOne will advise on selection but is not liable for third-party service interruptions, pricing changes, or terms modifications.

9. Confidentiality
Both parties agree to treat as confidential any proprietary information shared during the project. This obligation survives the completion or termination of the project.

10. Termination
Either party may terminate this agreement with 14 days written notice. In the event of termination, fees for all work completed up to the termination date remain payable. Any deposit paid is non-refundable once project work has commenced.

11. Limitation of Liability
OTwoOne''s total liability under this agreement shall not exceed the total project fees paid by the client. OTwoOne shall not be liable for any indirect, incidental, or consequential damages including loss of revenue, data, or business opportunity.

12. Force Majeure
Neither party shall be liable for delays or failure to perform obligations due to circumstances beyond reasonable control, including but not limited to natural disasters, pandemic, government actions, or infrastructure failures.

13. Governing Law
This agreement is governed by the laws of Ireland. Any disputes arising shall be subject to the exclusive jurisdiction of the Irish courts.'
);
