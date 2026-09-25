# cs373-fall-2026-18

 VaxAccess

**Connecting underserved communities to vaccine sites, vaccine information, and volunteer opportunities nationwide.**

VaxAccess is a civic-engagement platform that shows where vaccine access is weakest across the United States, focusing on rural counties and low-income communities with limited access to transportation, insurance, or provider coverage. It brings together federally-supported health center data, CDC vaccine and coverage data, and volunteer opportunities from national service organizations.

Residents can find a nearby place to get vaccinated and understand what they need. Community members can see where access is weakest nationally and act on it — by volunteering, contributing skills, and/or donating.

## Project information

| | |
|---|---|
| Canvas / Discord group | IDB-18 |
| Project name | VaxAccess |
| GitLab repository | cs373-fall-2026-18 |

## Contents

- [Questions the site answers](#questions-the-site-answers)
- [Data models](#data-models)
- [Model relationships](#model-relationships)
- [Data sources](#data-sources)
- [Civic engagement](#civic-engagement)
- [Team](#team)

## Questions the site answers

**1. Where's the nearest place to get vaccinated, and can I access it?**
Users filter/sort Sites by cost, distance, and accessibility to find providers near underserved zip codes.

**2. Which vaccines have the lowest coverage, and what do I need to know about them?**
Users sort Vaccines by national coverage rate and filter by age group to identify the biggest gaps.

**3. How can I help close the gap with my time, talent, or money?**
Users find VolunteerOpportunities tied to low-access sites and sign up directly.

## Data models

VaxAccess has three interconnected models. Every instance links to instances of the other two models, has at least five filterable/sortable card attributes, and includes at least two types of media.

| Model | Represents | Estimated instances |
|---|---|---|
| Site | HRSA-funded health centers, FQHCs, and vaccine providers nationwide | ~15,000 |
| Vaccine | CDC-tracked vaccines and the diseases they prevent | ~30 |
| VolunteerOpportunity | Volunteer roles supporting vaccine access, sourced from national service networks | ~5,000 |

### Site

Each Site is a HRSA-supported health center, FQHC, or vaccine-administering location. Health center "look-alikes" are included as a subtype rather than a separate model.

**Card attributes (filterable / sortable)**

| Attribute | Description |
|---|---|
| Cost | Free, sliding scale, or insurance-only |
| Vaccines offered | Count and list of vaccines available on-site |
| Distance from underserved area | Proximity to the nearest medically underserved area/HPSA |
| Accessibility | Walk-in availability, languages spoken on-site |
| Community need score | Based on HPSA/MUA designation for the surrounding area |

**Additional attributes:** address, coordinates, hours, phone number, site type (FQHC / look-alike / mobile unit), parent organization/grantee.

**Connections:** Each site links to the vaccines offered there and to the volunteer opportunities hosted at or supporting that site.

**Media:**
- Interactive map showing the site's location with directions
- Photo of the facility

### Vaccine

Each Vaccine is a CDC-tracked immunization — for example flu, COVID-19, MMR, HPV, Tdap, shingles, or RSV.

**Card attributes (filterable / sortable)**

| Attribute | Description |
|---|---|
| Recommended age group | E.g. infant, adolescent, adult, senior |
| National coverage rate | From CDC VaxView data |
| Number of doses | Dose schedule required |
| Disease category | Respiratory, childhood, travel, etc. |
| Side effect severity | Mild or moderate, per CDC guidance |

**Additional attributes:** description of the disease prevented, ACIP recommendation status, typical cost range, manufacturer(s).

**Connections:** Each Vaccine links to the Sites that offer it and to the volunteer opportunities focused on educating people about it.

**Media:**
- CDC explainer video
- Dosing/schedule infographic

### VolunteerOpportunity

Each VolunteerOpportunity is a role posted through a national volunteer network in support of vaccine access — clinic staffing, transportation, interpretation, outreach, or fundraising.

**Card attributes (filterable / sortable)**

| Attribute | Description |
|---|---|
| Role type | Medical, driver, interpreter, admin, fundraising |
| Time commitment | One-time or recurring |
| Spots remaining | Open slots left for the opportunity |
| Location / zip | Where the opportunity takes place |
| Sign-up deadline | Date by which volunteers must register |

**Additional attributes:** skills required, hosting organization, cause area, description.

**Connections:** Each opportunity links to the Site it supports and the Vaccine(s) it's tied to (e.g. an education or outreach role for a specific vaccine).

**Media:**
- Sign-up activity feed showing recent volunteers
- Short volunteer testimonial video

## Model relationships

Users can move between all three models from any detail page.

| Starting point | Connected models | Example user journey |
|---|---|---|
| Site | Vaccines offered there; VolunteerOpportunities hosted there | Find a low-access clinic, see which vaccines it offers, and find a way to volunteer there. |
| Vaccine | Sites where it's offered; VolunteerOpportunities focused on it | Look up a vaccine with low coverage, see where to get it, and find outreach opportunities promoting it. |
| VolunteerOpportunity | Site it supports; Vaccine(s) it's tied to | Discover a volunteer role, see which site it supports, and learn which vaccine(s) the work is helping promote. |

## Data sources

| # | Source | Primary model | Collection method | URL |
|---|---|---|---|---|
| 1 | HRSA Health Center Service Delivery Sites | Site | REST API / data download | data.hrsa.gov |
| 2 | HRSA Health Professional Shortage Areas (HPSA) / Medically Underserved Areas | Site | REST API / data download | data.hrsa.gov |
| 3 | CDC Vaccines.gov / VaccineFinder Provider Locations | Site | REST API (Socrata) | data.cdc.gov |
| 4 | CDC VaxView (ChildVaxView, COVIDVaxView) coverage data | Vaccine | Data download / dashboard export | cdc.gov/vaccines/data-reporting |
| 5 | CDC Immunization Schedules & Vaccine Information Statements | Vaccine | Web scraping / structured pages | cdc.gov/vaccines/hcp/imz-schedules |
| 6 | VolunteerMatch (Idealist) Open Network API | VolunteerOpportunity | REST API | developers.volunteermatch.org |
| 7 | AmeriCorps / Volunteer.gov listings | VolunteerOpportunity | Web scraping | volunteer.gov |

### How the data fits together

Health center sites are matched to HPSA/MUA designations to determine each Site's community need score. Vaccine coverage and schedule data from CDC VaxView and the CDC immunization schedules are linked to each Vaccine by name. Volunteer opportunities scraped or pulled from VolunteerMatch and AmeriCorps/Volunteer.gov are matched to the Sites and Vaccines they support based on the organization and cause area listed in each posting. HPSA/MUA designations and coverage rates are labeled as area-level indicators, not as direct measures of whether a specific individual lacks access.

## Civic engagement

VaxAccess helps users find where vaccine access is weakest and gives them concrete ways to help.

| Contribution | How users can help |
|---|---|
| Time | Volunteer at vaccine clinics, transportation drives, and community outreach events |
| Talent | Interpret, provide medical staffing, or run education/outreach campaigns |
| Money | Donate to organizations running VolunteerOpportunities in underserved areas |

## Team
- Nifemi Soyemi
- Enzo Sagun
- Luke Yan
- Alex Bui
- Jia Luthra