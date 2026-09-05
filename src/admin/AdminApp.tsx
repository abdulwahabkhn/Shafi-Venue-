import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  Menu,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import {
  contentSchema,
  type PublishedContent,
  type SiteContent,
} from "../../shared/content";
import { defaultContent } from "../content/defaults";
import logo from "../../public/media/shafi-marquee-logo.jpg";
import { ApiError, cmsRequest } from "./api";
import { ConfirmationProvider, useConfirmation } from './Confirmation';
import { ContentEditor, sections, type SectionId } from "./ContentEditor";
import "./admin.css";

type Session = {
  authenticated: boolean;
  configured: boolean;
  storageReady: boolean;
  local: boolean;
};
export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    document.title = "Website manager | Shafi Complex & Marquee";
    cmsRequest<Session>("session")
      .then(setSession)
      .catch(() =>
        setLoadError("We could not connect to the admin portal. Please retry."),
      );
  }, [refresh]);
  return (
    <div className="cms-app"><ConfirmationProvider>
      {loadError ? (
        <main className="cms-login">
          <h1>Connection interrupted</h1>
          <p role="alert">{loadError}</p>
          <button
            className="cms-button"
            onClick={() => {
              setLoadError("");
              setRefresh((value) => value + 1);
            }}
          >
            Retry connection
          </button>
          <a href="/">Return to website</a>
        </main>
      ) : !session ? (
        <main className="cms-login" role="status">
          Opening admin portal…
        </main>
      ) : !session.authenticated ? (
        <Login
          session={session}
          onLogin={() => {
            setSession({ ...session, authenticated: true });
            window.history.replaceState(null, "", "/admin");
          }}
        />
      ) : (
        <Manager
          session={session}
          onLogout={() => {
            setSession({ ...session, authenticated: false });
            window.history.replaceState(null, "", "/admin/login");
          }}
        />
      )}
    </ConfirmationProvider></div>
  );
}
function Login({
  session,
  onLogin,
}: {
  session: Session;
  onLogin: () => void;
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await cmsRequest("login", { password });
      setPassword("");
      setUnlocked(true);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cms-login-layout">
      <aside className="cms-login-brand">
        <a href="/" aria-label="Shafi Complex & Marquee home">
          <img
            src={logo}
            width="88"
            height="88"
            alt="Shafi Complex & Marquee"
          />
        </a>
        <div>
          <h2>
            A considered setting.
            <br />
            Carefully kept.
          </h2>
          <p>
            Your photographs, your words, your venue.
            <br />
            Keep every detail of the website up to date.
          </p>
        </div>
        <span>Shafi Complex & Marquee · Jaranwala</span>
      </aside>
      <main className="cms-login">
        <a className="cms-back" href="/">
          <ArrowLeft aria-hidden="true" />
          Back to website
        </a>
        <LockKeyhole className="cms-login-icon" aria-hidden="true" />
        <h1>{unlocked ? "You’re signed in." : "Admin portal"}</h1>
        <p>
          {unlocked
            ? "Manage website is now available in the website navigation. Open the editor whenever you’re ready."
            : "Sign in to manage the Shafi Complex & Marquee website."}
        </p>
        {unlocked ? (
          <>
            <button className="cms-button cms-primary" onClick={onLogin}>
              Manage website <ArrowRight aria-hidden="true" />
            </button>
            <a className="cms-back" href="/">
              Return to website
            </a>
          </>
        ) : (
          <form onSubmit={submit}>
            <label className="cms-field" htmlFor="admin-password">
              Admin password
            </label>
            <div className="cms-password">
              <input
                id="admin-password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                required
                disabled={!session.configured || busy}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={error ? "login-error" : undefined}
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? (
                  <EyeOff aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </button>
            </div>
            {error && (
              <p className="cms-error" id="login-error" role="alert">
                {error}
              </p>
            )}
            {!session.configured && (
              <p className="cms-error" role="status">
                Admin access needs to be set up. The site maintainer can
                configure it using CMS.md.
              </p>
            )}
            <button
              className="cms-button cms-primary"
              type="submit"
              disabled={!session.configured || busy}
            >
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight aria-hidden="true" />
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
function Manager({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const confirm = useConfirmation();
  const [published, setPublished] = useState<PublishedContent | null>(null);
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [section, setSection] = useState<SectionId>("hero");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dirty =
    published !== null &&
    JSON.stringify(content) !==
      JSON.stringify(published.content ?? defaultContent);
  const active = sections.find((item) => item.id === section)!;
  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await cmsRequest<PublishedContent>("content");
      setPublished(result);
      setContent(result.content ?? defaultContent);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirty || uploadCount) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, uploadCount]);
  useEffect(() => {
    if (confirmPublish) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [confirmPublish]);
  async function publish() {
    setConfirmPublish(false);
    setError("");
    setMessage("");
    const parsed = contentSchema.safeParse(content);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((issue) => `${issue.path.join(" → ")}: ${issue.message}`)
          .join("\n"),
      );
      return;
    }
    setBusy(true);
    try {
      const result = await cmsRequest<PublishedContent>("publish", {
        content: parsed.data,
        revision: published?.revision ?? null,
      });
      setPublished(result);
      setContent(result.content!);
      setSessionExpired(false);
      setMessage(
        "Your changes are published. The website now shows this version.",
      );
    } catch (error) {
      setError((error as Error).message);
      if (error instanceof ApiError && error.status === 401)
        setSessionExpired(true);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shafi-website-draft-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const change = (value: SiteContent) => {
    setContent(value);
    setMessage("");
    setError("");
  };
  return (
    <div className="cms-manager">
      <header className="cms-topbar">
        <button
          className="cms-icon-button cms-menu-toggle"
          aria-label={mobileOpen ? "Close sections" : "Open sections"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        <a className="cms-brand" href="/">
          <img src={logo} alt="" width="48" height="48" />
          <span>
            Shafi Complex & Marquee<small>Website manager</small>
          </span>
        </a>
        <a className="cms-view-link" href="/" target="_blank" rel="noreferrer">
          View website <ExternalLink aria-hidden="true" />
        </a>
      </header>
      <aside className={`cms-sidebar ${mobileOpen ? "cms-sidebar--open" : ""}`}>
        <nav aria-label="Website sections">
          {sections.map((item) => (
            <button
              key={item.id}
              disabled={busy || uploadCount > 0}
              className={section === item.id ? "cms-section-active" : ""}
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => {
                setSection(item.id);
                setMobileOpen(false);
                requestAnimationFrame(() => headingRef.current?.focus());
              }}
            >
              {item.label}
              <ArrowRight aria-hidden="true" />
            </button>
          ))}
        </nav>
        <div className="cms-sidebar-footer">
          <p>
            {session.local ? "Local workspace" : "Website content"}
            <span>{dirty ? "Unpublished changes" : "Published version"}</span>
          </p>
          <button
            className="cms-back"
            disabled={busy || uploadCount > 0}
            onClick={async () => {
              if (
                dirty &&
                !await confirm(
                  "Sign out and discard your unsaved changes? Download a draft first if you want to keep them.",
                )
              )
                return;
              try {
                await cmsRequest("logout", {});
                onLogout();
              } catch (error) {
                setError((error as Error).message);
              }
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="cms-workspace">
        <div className="cms-editor-heading">
          <div>
            <h1 ref={headingRef} tabIndex={-1}>
              {active.label}
            </h1>
            <p>{active.description}</p>
          </div>
          <span className={`cms-status ${dirty ? "cms-status--draft" : ""}`}>
            <span aria-hidden="true" />
            {dirty ? "Draft changes" : "Up to date"}
          </span>
        </div>
        {session.local && (
          <p className="cms-local-note">
            Local workspace: publishing updates this computer’s website preview.
            The live Vercel website uses its own storage.
          </p>
        )}
        {!session.storageReady && (
          <p className="cms-error" role="alert">
            Connect content storage before publishing. The setup instructions
            are in CMS.md.
          </p>
        )}
        {error && (
          <div className="cms-error cms-feedback" role="alert">
            {error}
            {!published && (
              <button className="cms-button" onClick={load}>
                Retry loading
              </button>
            )}
          </div>
        )}
        {sessionExpired && <p className="cms-note">Your draft is still here. <a href="/admin/login" target="_blank" rel="noreferrer">Sign in in another tab</a>, then return and publish again.</p>}
        {message && (
          <p className="cms-success cms-feedback" role="status">
            <Check aria-hidden="true" />
            {message}
          </p>
        )}
        {!published ? (
          <p role="status">
            {busy
              ? "Loading website content…"
              : "The editor will open when content is available."}
          </p>
        ) : (
          <fieldset className="cms-editor-boundary" disabled={busy || uploadCount > 0}>
            <ContentEditor
              section={section}
              content={content}
              onChange={change}
              onBusy={(value) =>
                setUploadCount((count) => count + (value ? 1 : -1))
              }
            />
          </fieldset>
        )}
        <footer className="cms-publish-bar">
          <div>
            <strong>
              {uploadCount
                ? "Image upload in progress"
                : dirty
                  ? "Ready when you are."
                  : "Your website content"}
            </strong>
            <span>
              {published?.publishedAt
                ? `Last published ${new Date(published.publishedAt).toLocaleString()}`
                : "Review your changes, then publish."}
            </span>
          </div>
          <div className="cms-publish-actions">
            <button
              className="cms-icon-button"
              title="Download draft"
              aria-label="Download draft"
              disabled={!published || busy}
              onClick={download}
            >
              <Download aria-hidden="true" />
            </button>
            <label className="cms-icon-button cms-import" title="Import draft">
              <Upload aria-hidden="true" />
              <span className="cms-sr-only">Import draft</span>
              <input
                type="file"
                accept="application/json,.json"
                disabled={busy || !published || uploadCount > 0}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 512000)
                      throw new Error("Draft is too large.");
                    const parsed = contentSchema.parse(
                      JSON.parse(await file.text()),
                    );
                    if (
                      !dirty ||
                      await confirm(
                        "Replace your current unsaved draft with this file?",
                      )
                    )
                      change(parsed);
                  } catch {
                    setError("This file is not a valid Shafi website draft.");
                  } finally {
                    event.target.value = "";
                  }
                }}
              />
            </label>
            <button
              className="cms-icon-button"
              aria-label="Reload published version"
              title="Reload published version"
              disabled={busy || uploadCount > 0}
              onClick={async () => {
                if (
                  !dirty ||
                  await confirm(
                    "Discard unsaved edits and reload the published website content?",
                  )
                )
                  void load();
              }}
            >
              <RotateCcw aria-hidden="true" />
            </button>
            <button
              className="cms-button cms-primary"
              disabled={
                !dirty || busy || uploadCount > 0 || !session.storageReady
              }
              onClick={() => setConfirmPublish(true)}
            >
              {busy ? "Saving…" : "Publish changes"}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </footer>
      </main>
      <dialog
        className="cms-dialog"
        ref={dialogRef}
        onCancel={() => setConfirmPublish(false)}
        aria-labelledby="publish-title"
      >
        <h2 id="publish-title">Publish these changes?</h2>
        <p>
          All edits across the website sections will become visible to visitors.
          The previous published version is kept as a backup.
        </p>
        <div>
          <button
            className="cms-button"
            onClick={() => setConfirmPublish(false)}
          >
            Keep editing
          </button>
          <button className="cms-button cms-primary" onClick={publish}>
            Publish website
          </button>
        </div>
      </dialog>
    </div>
  );
}
