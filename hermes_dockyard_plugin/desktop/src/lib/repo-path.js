// The onboarding wizard's early check on a repository path (issue #37).
//
// Only an early gate: the backend stays authoritative and still requires the
// path to resolve to an existing directory on the host. This check rules out
// what can never be an absolute path there, on any platform Hermes runs on.
//
// Accepted: a POSIX absolute path (/srv/repo) and a Windows drive path with
// either separator (C:\repo, C:/repo).
// Rejected: empty input, relative and dot paths, home-relative paths (~/repo),
// drive-relative paths (C:repo), rooted paths without a drive (\repo) and both
// UNC spellings (\\server\share, //server/share), which are out of scope.
const WINDOWS_DRIVE_ABSOLUTE = /^[A-Za-z]:[\\/]/

export function isAbsoluteRepoPath(value) {
  const path = String(value ?? '').trim()
  if (path.startsWith('//') || path.startsWith('\\\\')) return false
  return path.startsWith('/') || WINDOWS_DRIVE_ABSOLUTE.test(path)
}
