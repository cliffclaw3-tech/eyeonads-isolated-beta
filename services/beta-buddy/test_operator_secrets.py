import os,pathlib,tempfile,unittest
from operator_secrets import save_secret,read_secret
@unittest.skipUnless(os.name=='nt','Windows user-bound credential store')
class OperatorSecretTests(unittest.TestCase):
    def test_round_trip_never_writes_plaintext(self):
        with tempfile.TemporaryDirectory() as directory:
            file=pathlib.Path(directory)/'fixture.dpapi';value='synthetic-credential-not-a-real-token'
            save_secret(file,value)
            self.assertNotIn(value.encode(),file.read_bytes());self.assertEqual(read_secret(file),value)
    def test_plaintext_files_and_corrupt_ciphertext_denied(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):save_secret(pathlib.Path(directory)/'plain.txt','fixture')
            file=pathlib.Path(directory)/'broken.dpapi';file.write_bytes(b'not-encrypted')
            with self.assertRaises(OSError):read_secret(file)
