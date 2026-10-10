import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Mail } from 'lucide-react';
import { PageHeading } from '../components/Layout';
import { Select } from '../components/Select';
import cozy from '../../shared/cozymood.json';
import './cozymood.css';

/**
 * Cozy Mood, the studio's game: its help page (/cozymood) and its privacy policy
 * (/cozymood/privacy), linked from its App Store and Google Play listings. The game
 * speaks 15 languages, so these pages do too (?lang=…, English by default); the
 * texts come from the game's project (tools/store/site_content.py there).
 */
type Code = keyof typeof cozy.help;
const CJK = ['ja', 'zh_CN', 'zh_TW'];

export default function CozyMood() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const asked = params.get('lang') ?? 'en';
  const code = (asked in cozy.help ? asked : 'en') as Code;
  const lang = cozy.languages.find((l) => l.code === code)!.lang;
  const stop = CJK.includes(code) ? '' : '.';
  const colon = CJK.includes(code) ? '：' : code === 'fr' ? ' : ' : ': ';
  const query = code === 'en' ? '' : '?lang=' + code;
  const help = cozy.help[code];
  const mail = (
    <a href={'mailto:' + cozy.email} lang="en">
      {cozy.email}
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
        {cozy.languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </Select>
    </label>
  );
  if (pathname.replace(/\/$/, '') === '/cozymood/privacy') {
    const privacy = cozy.privacy[code];
    const date = new Intl.DateTimeFormat(code === 'en' ? 'en-US' : lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(cozy.updated + 'T00:00:00Z'));
    return (
      <div className="container page legal-page cozy-page" lang={lang}>
        <PageHeading
          eyebrow="COZY MOOD"
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
            {mail} · <Link to={'/cozymood' + query}>{help.title}</Link>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="container page contact-page cozy-page" lang={lang}>
      <PageHeading eyebrow="COZY MOOD" title={help.title + stop} text={help.intro}>
        {picker}
      </PageHeading>
      <div className="contact-card">
        <Mail size={32} />
        <h2>{help.write}</h2>
        <a className="btn" href={'mailto:' + cozy.email} lang="en">
          {cozy.email}
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
          <Link to={'/cozymood/privacy' + query}>
            {help.privacyLink} <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </p>
      </div>
    </div>
  );
}
