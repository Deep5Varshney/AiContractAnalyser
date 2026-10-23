import json
import os
import uuid
import boto3
from botocore.config import Config

s3_client = boto3.client('s3', config=Config(signature_version='s3v4'))
# Fallback to S3_BUCKET_NAME or 'ai-contract-vault' to prevent missing bucket errors
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME') or os.environ.get('BUCKET_NAME') or 'ai-contract-vault'

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
}

def lambda_handler(event, context):
    try:
        # Robustly parse body whether it's a string, dict, or direct invocation
        body = event
        if "body" in event:
            if isinstance(event["body"], str):
                try:
                    body = json.loads(event["body"])
                except Exception:
                    body = {}
            elif isinstance(event["body"], dict):
                body = event["body"]

        file_name = body.get('file_name') or body.get('fileName')
        file_type = body.get('file_type') or body.get('fileType')
        user_id = body.get('user_id') or body.get('userId')

        if not file_name or not file_type or not user_id:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Missing file_name, file_type, or user_id"})
            }

        ext = file_name.split('.')[-1]
        s3_key = f"uploads/{user_id}/{uuid.uuid4()}.{ext}"

        presigned_url = s3_client.generate_presigned_url(
            ClientMethod='put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'ContentType': file_type
            },
            ExpiresIn=300
        )

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "upload_url": presigned_url,
                "s3_key": s3_key
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": str(e)})
        }