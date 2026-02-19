# AMP Errors Table Schema

**Purpose:** Error inbox for AMP (Automated Migration Pipeline) failures  
**Location:** Airtable base (tenant-specific)  
**Table Name:** `AMP Errors`

## Table Structure

### Fields

| Field Name | Type | Description |
|------------|------|-------------|
| **PipelineID** | Single line text | ID of the pipeline that generated the error |
| **Tenant** | Single line text | Tenant name (for multi-tenant isolation) |
| **RawRow** | Long text | JSON string of the raw row data that failed |
| **ErrorMessage** | Long text | Error message describing why the row failed |
| **Timestamp** | Date | When the error occurred (ISO 8601 format) |
| **ExecutionID** | Single line text | ID of the pipeline execution that generated this error |
| **MappingProfile** | Single line text | Transformation profile used during the failed attempt |
| **RetryCount** | Number | Number of times this row has been retried (default: 0) |
| **LastRetryAt** | Date | Timestamp of the last retry attempt (if any) |
| **Status** | Single select | Status: `pending`, `retrying`, `resolved`, `failed` |

## Usage

This table serves as the **error inbox** for AMP-ER (Automated Migration Pipeline Error & Retry Engine).

When a pipeline execution fails to transform or insert a row:
1. The raw row data is captured
2. The error message is captured
3. A record is created in this table
4. The record can be retried via the Retry API

## Multi-Tenant Isolation

Each tenant has their own Airtable base, so errors are automatically isolated per tenant.

## Example Record

```json
{
  "PipelineID": "pipe_abc123",
  "Tenant": "usha",
  "RawRow": "{\"ClientFirst\":\"John\",\"ClientLast\":\"Doe\",\"ClientEmail\":\"invalid-email\"}",
  "ErrorMessage": "Invalid email format",
  "Timestamp": "2025-01-02T10:30:00Z",
  "ExecutionID": "exec_xyz789",
  "MappingProfile": "usha-export",
  "RetryCount": 0,
  "LastRetryAt": null,
  "Status": "pending"
}
```
