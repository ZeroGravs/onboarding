# Security policy

Onboarding Kit is an experimental `0.1` preview. Its tours are not
an authorization boundary, a sandbox, or proof that a user completed a business
action. See [application security boundaries](docs/security.md) for safe integration.

## Supported versions

For published packages, security fixes target the latest patch of the current minor
release unless a release notice explicitly states otherwise. Older minor versions
and unsupported framework versions are not covered by default.

## Reporting a vulnerability

Do not disclose a potential vulnerability through a public issue, discussion, or
pull request.

Use GitHub's private vulnerability reporting: open the repository's **Security**
tab and choose **Report a vulnerability**. This option is available only after
the repository owner enables private reporting.

If that option is unavailable and no private maintainer contact has been published,
request a private contact channel without including vulnerability details. Do not
post reproduction code, exploit details, logs, or sensitive information publicly
while waiting for a private channel.

In the private report, include:

- The affected package, version or commit, framework, and environment.
- A minimal reproduction using synthetic data.
- The expected and observed behavior, impact, and any known workaround.

Never include live credentials, personal information, or private application data.
Do not test against applications, infrastructure, or accounts without authorization.

## Handling reports

Maintainers will assess reports and coordinate fixes and disclosure on a best-effort
basis. There is no guaranteed response time, bounty program, or support SLA.
Coordinate public disclosure with maintainers so affected users can update first.
