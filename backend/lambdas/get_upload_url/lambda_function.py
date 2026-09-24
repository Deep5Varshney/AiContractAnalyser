


import json
import os
import uuid
import boto3
from botocore.config import Config

s3_client = boto3.client('s3', config=Config(signature_version='s3v4'))
BUCKET_NAME = os.environ.get('BUCKET_NAME')

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
}

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body') or '{}')
        file_name = body.get('file_name')
        file_type = body.get('file_type')
        user_id = body.get('user_id')

        if not file_name or not file_type or not user_id:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Missing file_name, file_type, or user_id"})
            }

        ext = file_name.split('.')[-1]
        s3_key = f"contracts/{user_id}/{uuid.uuid4()}.{ext}"

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