# Typescript Journalctl
TypeScript library of the journalctl tool included in Linux distributions.

# API
import or require the module and create a new instance:

### Import
```typescript
import Journalctl from '@mahsumurebe/journalctl';
```

### Require

```typescript
const Journalctl = require('@mahsumurebe/journalctl');
```

### Create a New Instance

```typescript
const journalctl = new Journalctl([opts])
```

The optional object ``object`` can be have the following properties.

- ``identifier``: Show entries with the specified syslog identifier
- ``units``: Show logs from the specified unit(s)
- ``userUnits``: Show logs from the specified user unit(s)
- ``all``: Show all fields, including long and unprintable
- ``lines``: Show entries with the specified syslog identifier
- ``since``: Show entries not older than the specified date
- ``utc``: Express time in Coordinated Universal Time (UTC)

### Event: 'event'
It is triggered at each log event and returns the object event that describes the event.
```typescript
journalctl.on('event', (event: IJournalEvent) => {
    console.log(event);
})
```
### Method: stop
Stops journalctl stream.
```typescript
journalctl.stop();
```