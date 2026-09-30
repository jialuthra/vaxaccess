# cs373-fall-2026-18

 VaxAccess

**Helping uninsured and underinsured people in Austin and Travis County understand vaccination options, find resources, and see how the community supports vaccine access.**

VaxAccess is a civic-engagement platform focused on Austin and Travis County. It connects documented community vaccination sites, vaccine categories, and volunteer opportunities, with a focus on people who are uninsured or underinsured. The primary journey helps residents find vaccination resources. A secondary journey shows how community members have supported vaccine access through volunteering.

Phase I is an informational directory. It does not book appointments, accept payments, register volunteers, or collect health information. For current vaccination services, see [Austin Public Health's immunization resources](https://www.austintexas.gov/health/programs/immunizations).

## Project information

| | |
|---|---|
| Canvas / Discord group | IDB-18 |
| Project name | VaxAccess |
| GitLab repository | [cs373-fall-2026-18](https://gitlab.com/nifemisoyemi/cs373-fall-2026-18) |
| Production URL | https://vaxaccess.me |
| Phase I leader | Jia Luthra |

## Contents

- [Questions the site answers](#questions-the-site-answers)
- [Historical data](#historical-data)
- [Data models](#data-models)
- [Model relationships](#model-relationships)
- [Data sources](#data-sources)
- [Technology](#technology)
- [Civic engagement](#civic-engagement)
- [Team](#team)
- [Submission info](#submission-info)

## Questions the site answers

**1. Where has community vaccination happened in Austin, and where can I find current services?**
Users browse Sites by address, population served, cost/payment, appointment method, and vaccines offered. Every Site links to Austin Public Health's current resources.

**2. What do I need to know about a vaccine?**
Users browse Vaccines by diseases prevented, intended age group, vaccine type, administration, and dose/schedule. Each links to official CDC guidance.

**3. How has the community helped close the gap?**
Users browse VolunteerOpportunities by organization, activity, time commitment, requirements, and supported vaccines, and follow links to organizer information.

## Historical data

Phase I uses real, documented historical examples of community vaccination work from 2020–2024. They are not a current appointment directory. Each Site and VolunteerOpportunity displays its dated context, past activities show "Past activity — not accepting signups through this listing," and facts the source doesn't establish are shown as "Not stated in the historical source."

## Data models

VaxAccess has three interconnected models with three instances each. Every instance links to at least one instance of each other model, has five filterable and sortable card attributes, and includes two types of embedded media.

| Model | Represents | Phase I instances |
|---|---|---|
| Site | A venue with documented community vaccination activity | 3 |
| Vaccine | A vaccine category (not a branded product) | 3 |
| VolunteerOpportunity | A volunteer program or event supporting vaccine access | 3 |

The site has exactly 14 pages: Home, three model listings, nine detail pages, and About.

### Site

| Card attribute | Description |
|---|---|
| Address | Street address of the venue |
| Population served | Who the documented activity served |
| Cost/payment | Cost at the documented event, when stated |
| Appointment method | How people accessed vaccination, when stated |
| Offered vaccines | Vaccines documented at the site |

**Instances:** Travis County Exposition Center (influenza, 2020); Montopolis Recreation and Community Center (mpox, 2024); Austin First Spanish SDA Church (COVID-19, 2021).

**Media:** facility or neighborhood photograph and an embedded OpenStreetMap of the location.

### Vaccine

| Card attribute | Description |
|---|---|
| Diseases prevented | The disease(s) the vaccine targets |
| Intended age group | Who the vaccine is generally recommended for |
| Vaccine type | E.g. inactivated, mRNA, live nonreplicating |
| Administration | Injection, nasal spray, subcutaneous, etc. |
| Dose/schedule | Summary of dosing, qualified by current guidance |

**Instances:** Influenza, COVID-19, Mpox.

**Media:** photograph and Austin Public Health's educational video *Getting Immunized From A to Z*.

### VolunteerOpportunity

| Card attribute | Description |
|---|---|
| Organization | The organizing group |
| Activity | Type of volunteer work |
| Time commitment | Expected duration or cadence, such as a single-day event or recurring weekly outreach (never the calendar date) |
| Requirements | Documented prerequisites for volunteers |
| Supported vaccines | Vaccines the activity supported |

**Instances:** UT nursing flu-vaccination support at the Expo Center (2020); Austin–Travis County Medical Reserve Corps mpox-clinic support (2024); VAMOS community COVID-19 outreach at Rundberg (2021).

**Media:** photograph and an embedded OpenStreetMap of the supported Site.

## Model relationships

Users can move between all three models from any detail page. Each connection is backed by a cited source.

| Site | Vaccine | VolunteerOpportunity |
|---|---|---|
| Travis County Exposition Center | Influenza | UT nursing flu support, 2020 |
| Montopolis Recreation and Community Center | Mpox | MRC mpox-clinic support, 2024 |
| Austin First Spanish SDA Church | COVID-19 | VAMOS Rundberg outreach, 2021 |

## Data sources

Domain data is collected programmatically during development, curated into versioned JSON, and bundled with the site.

| Source | Used for | Collection method |
|---|---|---|
| [UT Austin School of Nursing](https://nursing.utexas.edu/) (flu-volunteer notice, VAMOS report) | Flu and COVID-19 events, locations, volunteer participation | HTML scraping |
| [Austin Public Health / City of Austin](https://www.austintexas.gov/health/programs/immunizations) and Travis County | Mpox event corroboration, facility addresses, current resources | HTML scraping |
| FOX 7 Austin event report | Mpox event date, venue, and price | HTML scraping |
| [CDC](https://www.cdc.gov/vaccines/) | Vaccine category fields | HTML scraping |
| [U.S. Census Geocoder](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html) | Site coordinates | REST API |

Photographs come from Wikimedia Commons under their recorded licenses, with credits shown next to each image and on the About page.

## Technology

| Area | Tool |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Bootstrap |
| Hosting | AWS Amplify at vaxaccess.me |
| Statistics service | AWS Lambda serving About-page commit, issue, and unit-test statistics |
| Repository statistics | [GitLab REST API](https://docs.gitlab.com/api/rest/), read by the statistics Lambda |
| Testing | Vitest, React Testing Library, Playwright |
| API design | Postman (documents the planned `/api/v1` domain API) |
| CI | GitLab CI |

See [DESIGN.md](DESIGN.md) for the full Phase I specification.

## Civic engagement

VaxAccess points residents to vaccination resources and shows concrete ways community members have supported vaccine access.

| Contribution | Examples |
|---|---|
| Time | Staffing vaccination clinics and community outreach events |
| Talent | Supervised nursing care, patient education, and outreach |
| Connection | Following organizer links such as the Austin–Travis County Medical Reserve Corps |

## Team

| Name | GitLab username | Phase I role |
|---|---|---|
| Jia Luthra | jiakl | Phase I leader |
| Alex Bui | atb2923 | Team member |
| Enzo Sagun | j.enzosagun | Team member |
| Nifemi Soyemi | nifemisoyemi | Team member |
| Luke Yan | lukeyawn | Team member |

## Submission info

| Field | Value |
|---|---|
| GitLab pipeline URL | TODO |
| Git SHA | TODO |
| Postman URL | TODO |

### Jia Luthra

| Field | Value |
|---|---|
| Full name | Jia Luthra |
| EID | TODO |
| GitLab ID | jiakl |
| Estimated completion time | TODO |
| Actual completion time | TODO |
| Comments | TODO |

### Alex Bui

| Field | Value |
|---|---|
| Full name | Alex Bui |
| EID | TODO |
| GitLab ID | atb2923 |
| Estimated completion time | TODO |
| Actual completion time | TODO |
| Comments | TODO |

### Enzo Sagun

| Field | Value |
|---|---|
| Full name | Enzo Sagun |
| EID | TODO |
| GitLab ID | j.enzosagun |
| Estimated completion time | TODO |
| Actual completion time | TODO |
| Comments | TODO |

### Nifemi Soyemi

| Field | Value |
|---|---|
| Full name | Nifemi Soyemi |
| EID | TODO |
| GitLab ID | nifemisoyemi |
| Estimated completion time | TODO |
| Actual completion time | TODO |
| Comments | TODO |

### Luke Yan

| Field | Value |
|---|---|
| Full name | Luke Yan |
| EID | TODO |
| GitLab ID | lukeyawn |
| Estimated completion time | TODO |
| Actual completion time | TODO |
| Comments | TODO |
