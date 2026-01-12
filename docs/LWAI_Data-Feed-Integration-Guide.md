# LWAI: Data Feed Integration Guide

AWS Documentation for Cross-Account Athena access: [link](https://docs.aws.amazon.com/athena/latest/ug/cross-account-permissions.html)

## Athena Connection Properties

- AWS region: us-east-1
- Database name: coachbot-data-feed
- Required IAM Role: arn:aws:iam::515451715086:role/alphacoachbot-production-alphacoachbotproductiona-15USUMI5JRGHW

## Athena Data Tables

### Daily Learning Metrics

- Table name: daily_learning_metrics

This table contains a record for each unique subject \- app \- course combination that each student worked on during a particular day.

Important notes:

- Time data is not distributed across courses within the same app-subject combination. The time is allocated to the course with the most activity.

| Column                                    | Type    | Description                                                                                   |
| :---------------------------------------- | :------ | :-------------------------------------------------------------------------------------------- |
| date                                      | string  | Date, as per CT timezone                                                                      |
| student                                   | string  | Student’s full name, preferred name is used instead of first name if present                  |
| email                                     | string  | Student’s e-mail                                                                              |
| coach                                     | string  | Coach/Guide’s full name                                                                       |
| school                                    | string  | School name                                                                                   |
| team                                      | string  | The Alpha House name, or GT School team name                                                  |
| app                                       | string  | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                                                |
| course                                    | string  | Learning App Course Name                                                                      |
| subject                                   | string  | Subject Name (‘Math’, ‘Language’, etc)                                                        |
| active_minutes                            | decimal | Total minutes student worked in the app (as reported by XO)                                   |
| active_minutes_2x_threshold_low           | decimal | Lower limit for 2x minutes **(Not in use)**                                                   |
| correct_questions_hr                      | decimal | Ratio of correct questions per hour                                                           |
| correct_questions                         | int     | Total number of questions answered correctly                                                  |
| correct_questions_hr_2x_threshold_low     | decimal | Lower limit for hourly correct question ratio **(Not in use)**                                |
| correct_questions_hr_2x_threshold_high    | decimal | Higher limit for hourly correct question ratio **(Not in use)**                               |
| correct_questions_percentage              | int     | The percentage of questions answered correctly, as a % of total questions answered            |
| total_questions_attempted                 | int     | The total number of questions attempted                                                       |
| levels_mastered                           | int     | The number of levels mastered in the course for the specific day                              |
| total_course_levels                       | int     | Total number of levels in the course **(Not reliable due to curriculum changes)**             |
| total_mastered_levels                     | int     | Total of mastered levels in the course                                                        |
| learning_level                            | string  | The student’s Learning Level (e.g. L1, L2, etc)                                               |
| external_student_id                       | string  | GT School or Alpha student ID                                                                 |
| course_levels_mastered_hr_mean            | decimal | The mean value for levels mastered /hr for this course **(Not in use)**                       |
| learning_unit_passed                      | string  | The label for mastered units (e.g. “Skills Achieved” in IXL, and “Quizzes passed” in Newsela) |
| learning_2x_minutes                       | int     | The number of 2x minutes **(Not in use)**                                                     |
| student_id                                | string  | CoachBot’s internal student ID                                                                |
| antipattern_finding_names                 | string  | A list of all detected antipatterns                                                           |
| antipattern_count                         | int     | The total number of antipatterns detected                                                     |
| max_time_wasted_percentage                | decimal | Highest time wasted percentage in these findings **(Not in use)**                             |
| max_correct_questions_impacted_percentage | decimal | Highest correct question percentage impacted by a single antipattern finding **(Not in use)** |
| max_correct_questions_impacted            | int     | Highest number of correct questions impacted by a single antipattern finding **(Not in use)** |

### Antipattern Findings

- Table name: antipattern_findings

This table contains occurrences of [learning antipatterns](https://docs.google.com/document/d/1qICypbCR3rqqqUOprOcvly15k4wfCGU0DOD9m1gEysU/edit).

| Column                                | Type   | Description                                                                  |
| :------------------------------------ | :----- | :--------------------------------------------------------------------------- | ----------------- | --------------- | ------ |
| student                               | string | Student’s full name, preferred name is used instead of first name if present |
| external_student_id                   | string | GT School or Alpha student ID                                                |
| name                                  | string | Antipattern name                                                             |
| category                              | string | Antipattern category                                                         |
| key_metric                            | string | Antipattern key metric ("Time"                                               | "CQPH"            | "Accuracy")     |
| antipattern_severity                  | string | Antipattern severity ("High"                                                 | "Medium"          | "Low")          |
| description                           | string | Antipattern description                                                      |
| internal_description                  | string | Antipattern internal description                                             |
| general_coaching                      | string | General coaching for the student                                             |
| implementation                        | string | Antipattern finder implementation ("Automated"                               | "Manual Coachbot" | "Academic Team" | “CNU”) |
| antipattern_app                       | string | Learning App Name (‘IXL’, ‘Khan Academy’, etc) or ‘All’                      |
| antipattern_extended_values           | string | Stringified json with additional data about antipattern                      |
| antipattern_is_active                 | string | 'Yes'                                                                        | 'No'              |
| started_on                            | string | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone)                |
| ended_on                              | string | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone)                |
| app                                   | string | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                               |
| subject                               | string | Subject Name (‘Math’, ‘Language’, etc)                                       |
| course                                | string | Learning App Course Name                                                     |
| finding_extended_values               | string | JSON string with additional data about the antipattern finding               |
| supporting_evidence                   | string | Evidence that the antipattern finding took place                             |
| specific_coaching                     | string | Coaching for the student, specific to this antipattern finding.              |
| internal_notes                        | string | Any internal notes about the finding                                         |
| detected_by                           | string | Who detected the antipattern finding                                         |
| student_feedback                      | string | 'Yes'                                                                        | 'No'              |
| student_feedback_notes                | string | Student’s feedback about the antipattern finding                             |
| time_wasted_percentage                | string | Estimated percentage of time wasted due to this finding                      |
| correct_questions_impacted_percentage | string | Estimated percentage of correct questions affected by this finding           |
| correct_questions_impacted            | string | Estimated number of correct questions affected by this finding               |
| specific_description                  | string | A description specific to this antipattern finding.                          |
| status                                | string | ‘Testing’                                                                    | ‘Active’          |
| wasted_minutes                        | int    | Minutes wasted due to this antipattern                                       |

### Topic Mastery

- Table name: topic_mastery

This table contains a daily rollup of the student’s activity within a specific topic in a learning app. See [this ITD](https://docs.google.com/document/u/0/d/1IvPdT68AxSFzsX965hBpvANhQLta51ewRVZQ6RHxyQs/edit) for more information on how courses, topics, and levels are modeled in CoachBot.

| Column                    | Type    | Description                                                                                                       |
| :------------------------ | :------ | :---------------------------------------------------------------------------------------------------------------- |
| id                        | string  | CoachBot’s internal Topic Mastery ID                                                                              |
| date                      | string  | Format ‘yyyy-MM-dd’ (As per CT Timezone)                                                                          |
| student                   | string  | Student’s full name, preferred name is used instead of first name if present                                      |
| external_student_id       | string  | GT School or Alpha student ID                                                                                     |
| app                       | string  | Learning app name (‘IXL’, ‘Khan Academy’, etc)                                                                    |
| subject                   | string  | Subject Name (‘Math’, ‘Language’, etc)                                                                            |
| course                    | string  | Course name                                                                                                       |
| topic                     | string  | Topic name                                                                                                        |
| activity_units_attempted  | int     | Sum of all activity units (e.g. questions) attempted by the student in all child levels for this topic on the day |
| activity_units_correct    | int     | Sum of all activity units (e.g. questions) answered correctly by the student among all attempted                  |
| levels_passed             | int     | The number of levels completed in this topic at this date                                                         |
| app_reported_time_minutes | decimal | The time, in minutes, that the student worked in this topic (reported by app’s API)                               |

### Level Mastery

- Table name: level_mastery

This table contains a daily rollup of the student’s activity within a specific level in a learning app. See [this ITD](https://docs.google.com/document/u/0/d/1IvPdT68AxSFzsX965hBpvANhQLta51ewRVZQ6RHxyQs/edit) for more information on how courses, topics, and levels are modeled in CoachBot.

| Column                    | Type      | Description                                                                                                                                                                                                                                                                                                 |
| :------------------------ | :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                        | string    | Uuid of level mastery record                                                                                                                                                                                                                                                                                |
| mastered_at               | timestamp | This timestamp is populated when a skill is first mastered. (As per CT Timezone) Note that this is only populated through real-time data collection, and requires the data collector extension to be running on the student’s machine. It is not populated for apps that only have a scheduled integration. |
| topic_mastery_id          | string    | Uuid of parent topic mastery record                                                                                                                                                                                                                                                                         |
| date                      | string    | Format ‘yyyy-MM-dd’                                                                                                                                                                                                                                                                                         |
| student                   | string    | Student’s full name, preferred name is used instead of first name if present                                                                                                                                                                                                                                |
| external_student_id       | string    | GT School or Alpha student ID                                                                                                                                                                                                                                                                               |
| app                       | string    | Learning app name (‘IXL’, ‘Khan Academy’, etc)                                                                                                                                                                                                                                                              |
| subject                   | string    | Subject Name (‘Math’, ‘Language’, etc)                                                                                                                                                                                                                                                                      |
| course                    | string    | Course name                                                                                                                                                                                                                                                                                                 |
| topic                     | string    | Topic name                                                                                                                                                                                                                                                                                                  |
| level                     | string    | Level name                                                                                                                                                                                                                                                                                                  |
| mastery_percentage        | decimal   | Mastery percentage of this level at this date                                                                                                                                                                                                                                                               |
| activity_units_attempted  | int       | The number of activity units (e.g. questions) from this level attempted by the student at this date                                                                                                                                                                                                         |
| activity_units_correct    | int       | The number of activity units (e.g. questions) from this level answered correctly by the student at this date                                                                                                                                                                                                |
| app_reported_time_minutes | decimal   | The time (in minutes) the student spent on this level at this date according to the app                                                                                                                                                                                                                     |
| url                       | string    | The learning app level’s URL                                                                                                                                                                                                                                                                                |
| app_specific_data         | string    | Any app specific data for the learning app level                                                                                                                                                                                                                                                            |
| third_party_level_id      | string    | Third party ID for the learning app level                                                                                                                                                                                                                                                                   |
| resource_type             | string    | If the level is essential or not.                                                                                                                                                                                                                                                                           |
| active_minutes            | decimal   | Minutes student spent on the level(as per worksmart).                                                                                                                                                                                                                                                       |
| status                    | string    | Level status. Possible values: completed, in_progress, not_started                                                                                                                                                                                                                                          |

### Norms Tables

- Table name: norms_tables

This table contains normative data for various tests.

| Column     | Type   | Description                                             |
| :--------- | :----- | :------------------------------------------------------ |
| data_set   | string | Data Set (‘2020’, etc.)                                 |
| test_type  | string | Test Type (‘MAP’, ‘SAT’’)                               |
| subject    | string | Subject Name (‘Math’, ‘Language’, ‘Reading’, ‘Science’) |
| season     | string | Season (‘Fall’, etc.)                                   |
| grade      | string | Student Grade (‘K’, ‘1’, etc.)                          |
| percentile | int    | Percentile (1, 2, 3, etc.)                              |
| score      | int    | Student Score (111, 131, etc.)                          |

### Learning App Last Updates

- Table name: learning_app_last_updates

This table contains the most recent update times for sessions, mastery, and activities for each learning app.

| Column                        | Type   | Description                                                   |
| :---------------------------- | :----- | :------------------------------------------------------------ |
| app                           | string | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                |
| app_id                        | string | CoachBot’s internal learning app ID                           |
| time_data_last_updated_at     | string | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone) |
| mastery_data_last_updated_at  | string | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone) |
| activity_data_last_updated_at | string | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone) |

### Learning App Questions

- Table name: learning_app_questions

This table contains data on the individual questions that a student answered in a learning app . This is currently only populated for IXL.

| Column                           | Type    | Description                                                                                           |
| :------------------------------- | :------ | :---------------------------------------------------------------------------------------------------- |
| id                               | string  | The CoachBot internal Id for the learning app question                                                |
| topic_mastery_id                 | string  | The CoachBot internal Id for the topic mastery record                                                 |
| date                             | string  | Format ‘yyyy-MM-dd’ (from topic_mastery, CT Date)                                                     |
| student                          | string  | Student’s full name, preferred name is used instead of first name if present                          |
| external_student_id              | string  | The GT School or Alpha student ID                                                                     |
| app                              | string  | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                                                        |
| subject                          | string  | Subject Name (‘Math’, ‘Language’, etc)                                                                |
| course                           | string  | Course name                                                                                           |
| topic                            | string  | Topic name                                                                                            |
| level                            | string  | Level name                                                                                            |
| question_id                      | string  | The third party (learning app)’s question ID                                                          |
| correct                          | boolean | True or False based on whether the question was answered correctly                                    |
| question_shown_at                | string  | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone)                                         |
| answered_at                      | string  | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone)                                         |
| explanation_shown_at             | string  | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone)                                         |
| reading_explanation_completed_at | string  | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone)                                         |
| time_to_answer                   | int     | The time (in minutes) the student spent to answer the questions                                       |
| time_to_read_explanations        | int     | The time (in minutes) the student spent reading an explanation after answering a question incorreclty |

### Learning App Extended Data

- Table name: learning_app_extended_data

This table contains additional data/events collected from learning apps, that haven’t yet been added to the [LCD data model](https://docs.google.com/document/d/1IvPdT68AxSFzsX965hBpvANhQLta51ewRVZQ6RHxyQs/edit#bookmark=id.rgoejhqkvieo).

| Column              | Type   | Description                                                                              |
| :------------------ | :----- | :--------------------------------------------------------------------------------------- |
| id                  | string | CoachBot’s internal ID for the extended data record                                      |
| external_student_id | string | The GT School or Alpha student ID                                                        |
| student_id          | string | CoachBot’s internal student ID                                                           |
| student             | string | Student’s full name                                                                      |
| account_id          | string | The CoachBot internal learning app account ID for the student in the app                 |
| app                 | string | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                                           |
| app_id              | string | CoachBot’s internal learning app ID                                                      |
| subject_id          | string | CoachBot’s internal subject ID                                                           |
| subject             | string | Subject Name (‘Math’, ‘Language’, etc)                                                   |
| course_id           | string | CoachBot’s internal course ID                                                            |
| course              | string | Learning App Course Name                                                                 |
| topic_id            | string | CoachBot’s internal topic ID                                                             |
| topic               | string | Learning App Topic Name                                                                  |
| level_id            | string | CoachBot’s internal level ID                                                             |
| level               | string | Learning App Level Name                                                                  |
| time                | string | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’ (As per CT Timezone)                            |
| type                | string | The type of extended data (e.g. a question being answered, an article being viewed, etc) |
| extended_values     | string | JSON string for extended data                                                            |

### School calendar

- Table name: school_calendar

| Column          | Type    | Description                                     |
| :-------------- | :------ | :---------------------------------------------- |
| id              | string  | Uuid of the school calendar entry               |
| date            | string  | Format ‘yyyy-MM-dd’                             |
| school_day      | boolean | Boolean indicating if it’s a school day         |
| map_testing_day | boolean | Boolean indicating if it’s a map testing day    |
| session_name    | string  | Session name                                    |
| school_year     | string  | School year in format ‘yyyy-yyyy’ (‘2023-2024’) |

### Student Learning Recommendations

- Table name: student_learning_recommendations

This table contains data on the student learning recommendations.

| Column               | Type    | Description                                                                              |
| :------------------- | :------ | :--------------------------------------------------------------------------------------- |
| student              | string  | The student’s full name, preferred name is used instead of first name if this is present |
| student_id           | string  | CoachBot’s internal student ID                                                           |
| external_student_id  | string  | GT School or Alpha student ID                                                            |
| date                 | string  | Format ‘yyyy-MM-dd’                                                                      |
| recommendation_type  | string  | Type of recommendation (‘Skill recommender API \- Mastery’, etc.)                        |
| subject              | string  | Subject Name (‘Math’, ‘Language’, etc)                                                   |
| subject_id           | string  | CoachBot’s internal subject ID                                                           |
| level                | string  | Learning App Level Name                                                                  |
| topic                | string  | Learning App Topic Name                                                                  |
| course               | string  | Learning App Course Name                                                                 |
| third_party_level_id | string  | The third party ID for the learning app level                                            |
| app                  | string  | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                                           |
| deactivation_date    | string  | Format ‘yyyy-MM-dd’ (UTC Date)                                                           |
| deactivation_reason  | string  | Reason for deactivation (‘Mastered’, ‘New Jenga Recommendation Found’, etc.)             |
| is_active            | boolean | True or False based on whether the recommendation is active or not                       |

### Level Mastery Event History

- Table name: level_mastery_event_history

This table contains data on the level mastery event history.

| Column                   | Type      | Description                                                                              |
| :----------------------- | :-------- | :--------------------------------------------------------------------------------------- |
| id                       | string    | CoachBot’s internal level mastery event history ID                                       |
| level_mastery_id         | string    | CoachBot’s internal level mastery ID                                                     |
| learning_app_question_id | string    | CoachBot’s internal question ID                                                          |
| app                      | string    | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                                           |
| subject                  | string    | Subject Name (‘Math’, ‘Language’, etc)                                                   |
| course                   | string    | Learning App Course Name                                                                 |
| topic                    | string    | Learning App Topic Name                                                                  |
| level                    | string    | Learning App Level Name                                                                  |
| student                  | string    | The student’s full name, preferred name is used instead of first name if this is present |
| external_student_id      | string    | GT School or Alpha student ID                                                            |
| time                     | timestamp | Event timestamp (As per CT Timezone)                                                     |
| event                    | string    | Event type                                                                               |
| mastery_percentage       | decimal   | Mastery percentage of this level at this time                                            |

### Learning App Time

- Table name: learning_app_time

This table contains granular time records, indicating the specific periods throughout the day where they were active on the app.

| Column              | Type    | Description                                                                              |
| :------------------ | :------ | :--------------------------------------------------------------------------------------- |
| student             | string  | The student’s full name, preferred name is used instead of first name if this is present |
| student_id          | string  | CoachBot’s internal student ID                                                           |
| external_student_id | string  | GT School or Alpha student ID                                                            |
| app                 | string  | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                                           |
| app_id              | string  | CoachBot’s internal ID for the learning app                                              |
| subject             | string  | Subject Name (‘Math’, ‘Language’, etc)                                                   |
| subject_id          | string  | CoachBot’sinternal ID for the subject                                                    |
| date                | string  | Format ‘yyyy-MM-dd’ (as per CT Timezone)                                                 |
| start_time          | boolean | Datetime in format ‘YYYY-mm-DDTHH:MM:SS’                                                 |
| duration_minutes    | decimal | Time duration, indicated in minutes                                                      |

### Learning App Standards Enrichment

- Table name: learning_app_standards_enrichment

This table exposes the enriched app data structure, where levels in an app are tagged as essential/non-essential skills for CCSS, NGSS, or other standards

| Column                | Type   | Description                                                  |
| :-------------------- | :----- | :----------------------------------------------------------- | --------- | ------------- | ------------- | -------------- |
| standard              | string | External id from Standards (CCSS.MATH.CONTENT.2.G.A.1)       |
| resource_type         | string | Standard Resource Mapping type as (supporting                | essential | not_essential | best_learning | best_practice) |
| app_level_id          | string | CoachBot’s internal ID for the learning app level            |
| third_party_level_id  | string | The third party ID for the learning app level                |
| app_level             | string | The name of the learning app level                           |
| app_topic_id          | string | CoachBot’s internal ID for the learning app topic            |
| app_topic             | string | The topic name                                               |
| app_course_id         | string | CoachBot’s internal ID for the course                        |
| app_course            | string | The course name from LearningAppCourses                      |
| app_id                | string | CoachBot’s internal ID for the learning app                  |
| app                   | string | Learning App Name (‘IXL’, ‘Khan Academy’, etc)               |
| subject_id            | string | CoachBot’s internal ID for the subject                       |
| subject               | string | Subject Name (‘Math’, ‘Language’, etc)                       |
| resource_order        | int    | Standard resource mapping order number                       |
| standard_course       | string | The course name from Courses (1st Grade, 2nd Grade,...)      |
| standard_course_order | int    | The order_number from Courses (0-13)                         |
| standard_grade        | string | Grade column from Grades (K,1,2)                             |
| standard_grade_name   | string | Grade name from Grades (Kindergarten, Level 100, Level 200\) |
| standard_grade_order  | int    | Grade order_number from grades (0-13)                        |

###

### Test Scores

- Table name: test_scores

This table contains information about the tests that students have taken, including the subject, test type and score.

| Column                | Type    | Description                                                                  |
| :-------------------- | :------ | :--------------------------------------------------------------------------- |
| id                    | string  | CoachBot’s internal test score ID                                            |
| student               | string  | Student’s full name, preferred name is used instead of first name if present |
| student_id            | string  | CoachBot’s internal student ID                                               |
| external_student_id   | string  | GT School or Alpha student ID                                                |
| subject               | string  | Subject Name (‘Math’, ‘Language’, etc)                                       |
| season                | string  | Season (‘Fall’, etc.)                                                        |
| grade                 | string  | Student Grade (‘K’, ‘1’, etc.)                                               |
| test_name             | string  | Name of the test                                                             |
| test_duration_minutes | decimal | The time (in minutes)spent taking the test                                   |
| test_type             | string  | Test Type (‘MAP’, ‘SAT’, ‘SBE’)                                              |
| score                 | int     | Student Score (111, 131, etc.)                                               |
| standard_error        | decimal | Standard error usually in range \[3.0, 10.0\]                                |
| percentile            | int     | Percentile (1, 58, 99, etc.)                                                 |
| questions_answered    | int     | Number of questions that the student answered                                |
| accuracy              | decimal | Percentage of correct answers                                                |
| test_date             | date    | The date of the test (CT Date)                                               |
| third_party_test_id   | string  | The third party ID for the test                                              |

### Test Subscores

- Table name: test_sub_scores

Some test scores are broken down into sub-scores, for example a Math MAP test contains sub scores for Geometry, Algebra, etc. This table exposes the different subscores for a test.

| Column         | Type    | Description                                           |
| :------------- | :------ | :---------------------------------------------------- |
| test_score_id  | string  | CoachBot’s internal test sub score ID                 |
| name           | string  | Name of the subscore                                  |
| score          | int     | Student Score (111, 131, etc.)                        |
| standard_error | decimal | Standard error usually in range \[3.0, 10.0\]         |
| low_range      | int     | Low range for subscore                                |
| high_range     | int     | High range for subscore                               |
| rating         | string  | Rating for this subscore \[HiAvg,High,Avg,LoAvg,Low\] |

## Other datasets

### The “Daily Learning Metrics” dataset used in Joe’s Mastery dashboard

This dataset joins together:

- the Daily Learning Metrics table (described [here](#bookmark=id.4mb6j1grje39))
- the Alpha student roster
- the number of essential levels that a student has mastered on a specific day

| Column                                    | Type    | Description                                                                                   |
| :---------------------------------------- | :------ | :-------------------------------------------------------------------------------------------- |
| date                                      | string  | Date, as per CT timezone                                                                      |
| student                                   | string  | Student’s full name, preferred name is used instead of first name if present                  |
| email                                     | string  | The student’s e-mail                                                                          |
| coach                                     | string  | Coach/Guide’s full name                                                                       |
| school                                    | string  | School name                                                                                   |
| team                                      | string  | The Alpha House name, or GT School team name                                                  |
| app                                       | string  | Learning App Name (‘IXL’, ‘Khan Academy’, etc)                                                |
| app_id                                    | string  | CoachBot’s internal ID for the learning app                                                   |
| course                                    | string  | Learning App Course Name                                                                      |
| course_id                                 | string  | CoachBot’s internal ID for the course                                                         |
| subject                                   | string  | Subject Name (‘Math’, ‘Language’, etc)                                                        |
| active_minutes                            | decimal | Total minutes student worked in the app (as reported by XO)                                   |
| correct_questions_hr                      | decimal | Ratio of correct questions per hour                                                           |
| correct_questions                         | int     | Total number of questions answered correctly                                                  |
| correct_questions_percentage              | int     | The percentage of questions answered correctly, as a % of total questions answered            |
| total_questions_attempted                 | int     | The total number of questions attempted                                                       |
| levels_mastered                           | int     | The number of levels mastered in the course for the specific day                              |
| total_course_levels                       | int     | Total number of levels in the course                                                          |
| total_mastered_levels                     | int     | Total of mastered levels in the course                                                        |
| learning_level                            | string  | The student’s Learning Level (e.g. L1, L2, etc)                                               |
| external_student_id                       | string  | GT School or Alpha student ID                                                                 |
| course_levels_mastered_hr_mean            | decimal | The mean value for levels mastered /hr for this course **(Not in use)**                       |
| learning_unit_passed                      | string  | The label for mastered units (e.g. “Skills Achieved” in IXL, and “Quizzes passed” in Newsela) |
| student_id                                | string  | CoachBot’s internal student ID                                                                |
| antipattern_finding_names                 | string  | A list of all detected antipatterns                                                           |
| antipattern_count                         | int     | The total number of antipatterns detected                                                     |
| max_time_wasted_percentage                | decimal | Highest time wasted percentage in these findings **(Not in use)**                             |
| max_correct_questions_impacted_percentage | decimal | Highest correct question percentage impacted by a single antipattern finding **(Not in use)** |
| max_correct_questions_impacted            | int     | Highest number of correct questions impacted by a single antipattern finding **(Not in use)** |
| essential_levels_mastered                 | int     | The number of levels mastered on the day, which were also essential skills                    |
| Fields imported from the student roster   |         |                                                                                               |
| fullid                                    | string  | The full student ID, combining the campus ID with the student ID                              |
| campusid                                  | int     | The ID of the campus that the student attends                                                 |
| firstname                                 | string  | The student’s first name                                                                      |
| preferredname                             | string  | The student’s preferred name                                                                  |
| lastname                                  | string  | The student’s last name                                                                       |
| alphalevellong                            | string  | The Alpha learning level (e.g. Level 2\)                                                      |
| gradelevel                                | string  | The student’s grade                                                                           |
| email\[Alpha Student Roster\]             | string  | The student’s email                                                                           |
| campus                                    | string  | The campus that the student attends                                                           |
| group                                     | string  | The house/team that the student belongs to                                                    |
| fullname                                  | string  | The student’s full name                                                                       |
| alphalevelshort                           | string  | A short version of the Alpha level (e.g. L1)                                                  |
| alphalevel                                | decimal | A decimal representation of the Alpha learning level                                          |

###
