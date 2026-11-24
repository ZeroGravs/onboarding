export default function Home() {
  return (
    <>
      <p className="eyebrow">YOUR WORKSPACE, REIMAGINED</p>
      <h1>
        Less figuring out.
        <br />
        <span>More getting started.</span>
      </h1>
      <p className="intro">
        A little guidance goes a long way. Take a two-step tour of your new home for good ideas.
      </p>
      <section className="card featured" data-onboarding="welcome">
        <span className="badge">WELCOME ABOARD</span>
        <h2>One place for your next chapter</h2>
        <p>Your workspace is ready. Bring your ideas; we’ll help with the first steps.</p>
        <div className="metrics">
          <div>
            <strong>12</strong>
            <span>Open projects</span>
          </div>
          <div>
            <strong>04</strong>
            <span>Teammates</span>
          </div>
          <div>
            <strong>∞</strong>
            <span>Possibilities</span>
          </div>
        </div>
      </section>
      <div className="grid">
        <article className="card">
          <h3>Find your focus</h3>
          <p>A calm space to plan what matters next.</p>
        </article>
        <article className="card">
          <h3>Keep moving</h3>
          <p>Your next milestone is closer than you think.</p>
        </article>
      </div>
    </>
  );
}
