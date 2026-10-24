import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Mail } from 'lucide-react';
import { PageHeading } from '../components/Layout';
import { Select } from '../components/Select';
import app from '../../shared/artificials-share.json';
import './cozymood.css';

/**
 * Artificials Share, the studio's nearby-sharing app: its help page (/share) and
 * its privacy policy (/share/privacy), linked from its App Store and Google Play
 * listings. In English and Bahasa Indonesia (?lang=id), like the app. The
 * privacy text matches docs/PRIVACY_POLICY.md in the app's project.
 */
type Code = keyof typeof app.help;

export default function ArtificialsShare() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const asked = params.get('lang') ?? 'en';
  const code = (asked in app.help ? asked : 'en') as Code;
  const lang = app.languages.find((l) => l.code === code)!.lang;
  // Both languages end headings with a full stop and use ': ' before the address.
  const stop = '.';
  const colon = ': ';
  const query = code === 'en' ? '' : '?lang=' + code;
  const help = app.help[code];
  const mail = (
    <a href={'mailto:' + app.email} lang="en">
      {app.email}
    </a>
  );
  const picker = (
    <label className="cozy-language">
      <span lang="en">Language</span>
      <Select
        value={code}
        onValueChange={(value) =>
          setParams(value === 'en' ? {} : { lang: value }, { replace: true })
        }
        aria-label="Language of this page"
      >
        {app.languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </Select>
    </label>
  );
  if (pathname.replace(/\/$/, '') === '/share/privacy') {
    const privacy = app.privacy[code];
    const date = new Intl.DateTimeFormat(code === 'en' ? 'en-US' : lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(app.updated + 'T00:00:00Z'));
    return (
      <div className="container page legal-page cozy-page" lang={lang}>
        <PageHeading
          eyebrow="ARTIFICIALS SHARE"
          title={privacy.title + stop}
          text={privacy.updated + ' ' + date}
        >
          {picker}
        </PageHeading>
        <div className="notice">{privacy.short}</div>
        <div className="prose">
          <p>{privacy.intro}</p>
          {privacy.sections.map((section, i) => (
            <section key={section.h}>
              <h2>
                {i + 1}. {section.h}
              </h2>
              <p>{section.p}</p>
            </section>
          ))}
          <p>
            {privacy.contact}
            {colon}
            {mail} · <Link to={'/share' + query}>{help.title}</Link>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="container page contact-page cozy-page" lang={lang}>
      <PageHeading eyebrow="ARTIFICIALS SHARE" title={help.title + stop} text={help.intro}>
        {picker}
      </PageHeading>
      <div className="contact-card">
        <Mail size={32} />
        <h2>{help.write}</h2>
        <a className="btn" href={'mailto:' + app.email} lang="en">
          {app.email}
          <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="prose cozy-faq">
        {help.faq.map((item) => (
          <section key={item.q}>
            <h2>{item.q}</h2>
            <p>{item.a}</p>
          </section>
        ))}
        <p>
          <Link to={'/share/privacy' + query}>
            {help.privacyLink} <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  );
}
