// Command migrate-r2-s7a copies every object from the Cloudflare R2 bucket to s7a
// and rewrites R2 links in the database.
//
// Files used as avatars go to the public bucket (permanent link), all other files
// go to the private bucket (the database gets an s7a://<bucket>/<key> reference).
//
// By default it only prints the plan (dry run). With -copy it copies the files,
// with -apply it also rewrites the database in one transaction. Back up the database first.
//
//	migrate-r2-s7a -env /home/home-app/.env -s7a-env /home/s7a/.env \
//	  -db /home/home-app/data/home.db -s7a-url http://127.0.0.1:6465 [-copy] [-apply]
package main

import (
	"bufio"
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	imagemod "github.com/Dragodui/diploma-server/internal/modules/image"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	_ "github.com/glebarez/go-sqlite"
)

// column holds file links; visibility is used for files referenced from it.
type column struct {
	table, name string
	visibility  imagemod.Visibility
}

var columns = []column{
	{"users", "avatar", imagemod.Public},
	{"bills", "receipt_image", imagemod.Private},
	{"bill_schedules", "receipt_image", imagemod.Private},
	{"chat_messages", "image_url", imagemod.Private},
	{"shopping_items", "image", imagemod.Private},
}

func main() {
	envPath := flag.String("env", ".env", "home-app .env with R2_* and SERVER_URL")
	s7aEnvPath := flag.String("s7a-env", "", "s7a .env with API_KEY (or set S7A_API_KEY in -env)")
	dbPath := flag.String("db", "data/home.db", "home-app SQLite database")
	s7aURL := flag.String("s7a-url", "http://127.0.0.1:6465", "s7a API address reachable from here")
	doCopy := flag.Bool("copy", false, "copy files to s7a")
	apply := flag.Bool("apply", false, "copy files and rewrite links in the database")
	flag.Parse()
	if *apply {
		*doCopy = true
	}

	env, err := readEnv(*envPath)
	if err != nil {
		log.Fatal(err)
	}
	apiKey := env["S7A_API_KEY"]
	if *s7aEnvPath != "" {
		s7aEnv, err := readEnv(*s7aEnvPath)
		if err != nil {
			log.Fatal(err)
		}
		apiKey = s7aEnv["API_KEY"]
	}
	publicURL := firstNonEmpty(env["S7A_PUBLIC_URL"], env["SERVER_URL"])
	r2Base := strings.TrimSuffix(env["R2_PUBLIC_URL"], "/")
	if apiKey == "" || publicURL == "" || r2Base == "" {
		log.Fatal("need s7a API key, SERVER_URL (or S7A_PUBLIC_URL) and R2_PUBLIC_URL")
	}

	ctx := context.Background()
	db, err := sql.Open("sqlite", *dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// which keys are referenced as public files
	visibilityOf, err := referencedKeys(db, r2Base)
	if err != nil {
		log.Fatal(err)
	}

	r2, bucket := r2Client(ctx, env)
	keys, err := listR2(ctx, r2, bucket)
	if err != nil {
		log.Fatalf("list R2: %v", err)
	}
	inR2 := map[string]bool{}
	for _, k := range keys {
		inR2[k] = true
	}

	public, private := 0, 0
	for _, k := range keys {
		if visibilityOf[k] == imagemod.Public {
			public++
		} else {
			private++
		}
	}
	fmt.Printf("R2 bucket %q: %d objects (%d public, %d private)\n", bucket, len(keys), public, private)
	for k := range visibilityOf {
		if !inR2[k] {
			fmt.Printf("WARNING: database references %s, but it is missing in R2; link is left unchanged\n", k)
		}
	}
	if !*doCopy {
		fmt.Println("dry run: nothing copied. Use -copy to copy files, -apply to copy and rewrite the database.")
		return
	}

	svc, err := imagemod.NewS7AService(ctx, *s7aURL, apiKey, publicURL,
		firstNonEmpty(env["S7A_PUBLIC_BUCKET"], "home-public"), firstNonEmpty(env["S7A_PRIVATE_BUCKET"], "home-private"))
	if err != nil {
		log.Fatal(err)
	}

	for i, k := range keys {
		v := visibilityOf[k]
		if v == "" {
			v = imagemod.Private
		}
		if err := copyObject(ctx, r2, bucket, svc, k, v); err != nil {
			log.Fatalf("copy %s: %v", k, err)
		}
		fmt.Printf("[%d/%d] copied %s (%s)\n", i+1, len(keys), k, v)
	}

	if !*apply {
		fmt.Println("files copied, database not changed. Use -apply to rewrite links.")
		return
	}
	changed, err := rewriteLinks(db, r2Base, svc, inR2)
	if err != nil {
		log.Fatalf("rewrite database: %v", err)
	}
	fmt.Printf("database: %d links rewritten\n", changed)
}

func r2Client(ctx context.Context, env map[string]string) (*s3.Client, string) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(firstNonEmpty(env["R2_REGION"], "auto")),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(env["R2_ACCESS_KEY_ID"], env["R2_SECRET_ACCESS_KEY"], "")))
	if err != nil {
		log.Fatalf("R2 config: %v", err)
	}
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", env["R2_ACCOUNT_ID"])
	client := s3.NewFromConfig(cfg, func(o *s3.Options) { o.BaseEndpoint = aws.String(endpoint) })
	return client, env["R2_S3_BUCKET"]
}

func listR2(ctx context.Context, client *s3.Client, bucket string) ([]string, error) {
	var keys []string
	p := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{Bucket: aws.String(bucket)})
	for p.HasMorePages() {
		page, err := p.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, o := range page.Contents {
			keys = append(keys, aws.ToString(o.Key))
		}
	}
	return keys, nil
}

func copyObject(ctx context.Context, client *s3.Client, bucket string, svc *imagemod.S7AService, key string, v imagemod.Visibility) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	obj, err := client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
	if err != nil {
		return err
	}
	defer obj.Body.Close()
	contentType := firstNonEmpty(aws.ToString(obj.ContentType), "application/octet-stream")
	return svc.PutObject(ctx, v, key, contentType, obj.Body, aws.ToInt64(obj.ContentLength))
}

// referencedKeys returns R2 keys referenced in the database with their visibility.
// A key used anywhere as public stays public.
func referencedKeys(db *sql.DB, r2Base string) (map[string]imagemod.Visibility, error) {
	out := map[string]imagemod.Visibility{}
	for _, c := range columns {
		rows, err := db.Query(fmt.Sprintf("SELECT %s FROM %s WHERE %s LIKE ?", c.name, c.table, c.name), r2Base+"/%")
		if err != nil {
			if strings.Contains(err.Error(), "no such table") {
				continue
			}
			return nil, err
		}
		for rows.Next() {
			var link string
			if err := rows.Scan(&link); err != nil {
				rows.Close()
				return nil, err
			}
			key := strings.TrimPrefix(link, r2Base+"/")
			if out[key] != imagemod.Public {
				out[key] = c.visibility
			}
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, err
		}
	}
	return out, nil
}

// rewriteLinks replaces R2 links with s7a values in one transaction.
// Links to keys missing in R2 are left as they are.
func rewriteLinks(db *sql.DB, r2Base string, svc *imagemod.S7AService, inR2 map[string]bool) (int64, error) {
	visibilityOf, err := referencedKeys(db, r2Base)
	if err != nil {
		return 0, err
	}
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var total int64
	for key, v := range visibilityOf {
		if !inR2[key] {
			continue
		}
		newValue := svc.StoredValue(v, key)
		for _, c := range columns {
			res, err := tx.Exec(fmt.Sprintf("UPDATE %s SET %s = ? WHERE %s = ?", c.table, c.name, c.name), newValue, r2Base+"/"+key)
			if err != nil {
				if strings.Contains(err.Error(), "no such table") {
					continue
				}
				return 0, err
			}
			n, _ := res.RowsAffected()
			total += n
		}
	}
	return total, tx.Commit()
}

// readEnv parses KEY=VALUE lines, ignoring comments and surrounding quotes.
func readEnv(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	env := map[string]string{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		v = strings.TrimSpace(v)
		if len(v) >= 2 && (v[0] == '"' && v[len(v)-1] == '"' || v[0] == '\'' && v[len(v)-1] == '\'') {
			v = v[1 : len(v)-1]
		}
		env[strings.TrimSpace(k)] = v
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	if len(env) == 0 {
		return nil, errors.New(path + ": no variables")
	}
	return env, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
