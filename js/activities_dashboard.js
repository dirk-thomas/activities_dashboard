/**
 * Activities dashboard visualizes activities
 * from various platforms in a single user interface.
 *
 * Copyright (c) 2013-2015, Dirk Thomas
 * Distributed under the BSD 2-Clause license
 * https://github.com/dirk-thomas/activities_dashboard/
 **/

(function(namespace) {

  /*
   * An activity model has the following attributes:
   * - timestamp
   * - issues_opened
   * - issues_closed
   * - issue_comments
   * - pull_requests_opened
   * - pull_requests_closed
   * - pull_request_comments
   * - tags
   * - commits
   * - text
   * - url
   *   matches_filter (populated by the ActivityView)
   */
  namespace.ActivityModel = Backbone.Model.extend({
  });

  namespace.ActivityCollection = Backbone.Collection.extend({
    model: namespace.ActivityModel,
    // plain attribute comparator fails to order descending:
    /*comparator: function(model) {
      return - model.get('timestamp');
    },*/
    comparator: function(a, b) {
      ts_a = a.get('timestamp').toISOString();
      ts_b = b.get('timestamp').toISOString();
      // inverted order
      if (ts_a < ts_b) return 1;
      if (ts_a > ts_b) return -1;
      return 0;
    },
    set: function(models, options) {
      models.sort(this.comparator);
      return Backbone.Collection.prototype.set.call(this, models, options);
    },
  });

  namespace.ActivityView = Backbone.View.extend({
    tagName: 'div',
    className: 'activity',
    template: _.template($('#activity-template').html()),
    initialize: function(options) {
      console.debug('ActivityView.initialize() activity ' + this.model.get('timestamp'));
      this._filter_model = options.filter_model;
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
      this.listenTo(this._filter_model, 'change:age', this.update_filter_match);
      this.update_filter_match();
    },
    render: function() {
      console.debug('ActivityView.render() activity ' + this.model.get('timestamp'));
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    update_filter_match: function() {
      console.debug('ActivityView.update_filter_match()');
      var old_matches_filter = this.model.get('matches_filter');
      var matches_filter = this._filter_model.match_activity(this.model);
      if (matches_filter) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
      console.debug('ActivityView.update_filter_match() ' + matches_filter);
      this.model.set({matches_filter: matches_filter});
    },
  });

  namespace.ActivityListView = Backbone.View.extend({
    tagName: 'div',
    className: 'activitylist',
    initialize: function(options) {
      console.debug('ActivityListView.initialize()');
      this._filter_model = options.filter_model;
      this.listenTo(this.collection, 'add', this.addOne);
      this.listenTo(this.collection, 'reset', this.addAll);
      this.listenTo(this.collection, 'remove', this.removeOne);
      this.listenTo(this.collection, 'sort', this.render);
    },
    render: function() {
      console.debug('ActivityListView.render()');
      return this;
    },
    addOne: function(model) {
      var view = new namespace.ActivityView({
        model: model,
        filter_model: this._filter_model,
      });
      var index = this.collection.indexOf(model);
      var view_at_index = this._get_element_of_index(index);
      if (view_at_index.length) {
        console.debug('ActivityListView.addOne() activity ' + model.get('timestamp') + ' at index ' + index.toString());
        view_at_index.before(view.render().el);
      } else {
        console.debug('ActivityListView.addOne() activity ' + model.get('timestamp') + ' at the end');
        this.$el.append(view.render().el);
      }
    },
    addAll: function() {
      console.debug('ActivityListView.addAll()');
      this.$el.html('');
      this.collection.each(this.addOne, this);
      this.collection.sort();
    },
    removeOne: function(model, collection, options) {
      console.debug('ActivityListView.removeOne() activity ' + model.get('timestamp'));
      this._get_element_of_index(options.index).remove();
    },
    _get_element_of_index: function (index) {
      // in order for this to work the list of activities added with collection.set(activities)
      // must in the correct order, meaning newest to oldest
      return this.$('>' + namespace.ActivityView.prototype.tagName + ':eq(' + index.toString() + ')');
    }
  });


  namespace.ActivitySummary = function() {
    this.issues_opened = 0;
    this.issues_closed = 0;
    this.issue_comments = 0;
    this.pull_requests_opened = 0;
    this.pull_requests_closed = 0;
    this.pull_request_comments = 0;
    this.tags = 0;
    this.commits = 0;
    this.hasAnyActivity = function() {
      return this.hasIssueActivity() || this.hasPullRequestActivity() || this.tags > 0 || this.commits > 0;
    };
    this.hasIssueActivity = function() {
      return this.issues_opened > 0 || this.issues_closed > 0 || this.issue_comments > 0;
    };
    this.hasPullRequestActivity = function() {
      return this.pull_requests_opened > 0 || this.pull_requests_closed > 0 || this.pull_request_comments > 0;
    };
    this.addActivityModel = function(model) {
      this.issues_opened += model.get('issues_opened');
      this.issues_closed += model.get('issues_closed');
      this.issue_comments += model.get('issue_comments');
      this.pull_requests_opened += model.get('pull_requests_opened');
      this.pull_requests_closed += model.get('pull_requests_closed');
      this.pull_request_comments += model.get('pull_request_comments');
      this.tags += model.get('tags');
      this.commits += model.get('commits');
    };
    this.removeActivityModel = function(model) {
      this.issues_opened -= model.get('issues_opened');
      this.issues_closed -= model.get('issues_closed');
      this.issue_comments -= model.get('issue_comments');
      this.pull_requests_opened -= model.get('pull_requests_opened');
      this.pull_requests_closed -= model.get('pull_requests_closed');
      this.pull_request_comments -= model.get('pull_request_comments');
      this.tags -= model.get('tags');
      this.commits -= model.get('commits');
    };
    this.addActivitySummary = function(summary) {
      if (!summary) {
        return;
      }
      this.issues_opened += summary.issues_opened;
      this.issues_closed += summary.issues_closed;
      this.issue_comments += summary.issue_comments;
      this.pull_requests_opened += summary.pull_requests_opened;
      this.pull_requests_closed += summary.pull_requests_closed;
      this.pull_request_comments += summary.pull_request_comments;
      this.tags += summary.tags;
      this.commits += summary.commits;
    };
    this.removeActivitySummary = function(summary) {
      if (!summary) {
        return;
      }
      this.issues_opened -= summary.issues_opened;
      this.issues_closed -= summary.issues_closed;
      this.issue_comments -= summary.issue_comments;
      this.pull_requests_opened -= summary.pull_requests_opened;
      this.pull_requests_closed -= summary.pull_requests_closed;
      this.pull_request_comments -= summary.pull_request_comments;
      this.tags -= summary.tags;
      this.commits -= summary.commits;
    };
    this.isEqual = function(summary) {
      if (!summary) {
        return false;
      }
      return (
        this.issues_opened === summary.issues_opened &&
        this.issues_closed === summary.issues_closed &&
        this.issue_comments === summary.issue_comments &&
        this.pull_requests_opened === summary.pull_requests_opened &&
        this.pull_requests_closed === summary.pull_requests_closed &&
        this.pull_request_comments === summary.pull_request_comments &&
        this.tags === summary.tags &&
        this.commits === summary.commits
      );
    };
    this.reset = function() {
      this.issues_opened = 0;
      this.issues_closed = 0;
      this.issue_comments = 0;
      this.pull_requests_opened = 0;
      this.pull_requests_closed = 0;
      this.pull_request_comments = 0;
      this.tags = 0;
      this.commits = 0;
    };
  };


  /*
   * A repository model has the following attributes:
   * - id
   * - name
   * - full_name
   * - repo_url
   * - is_starred
   * - activity_summary (populated by the RepositoryView, aggregated from the collection of ActivityModels)
   * - matched_activity_summary (populated by the RepositoryView, aggregated from the collection of ActivityModels)
   *   matches_filter (populated by the RepositoryView)
   */
  namespace.RepositoryModel = Backbone.Model.extend({
  });

  namespace.RepositoryCollection = Backbone.Collection.extend({
    model: namespace.RepositoryModel,
    comparator: function(model) {
      return model.get('full_name').toLowerCase();
    },
  });

  namespace.RepositoryView = Backbone.View.extend({
    tagName: 'div',
    className: 'repo',
    template: _.template($('#repo-header-template').html()),
    events: {
      'click a': 'skip_event',
      'click .repo_header': 'toggle_activitylist',
      'click .reset_activities': 'reset_activities',
      'click .query_activities': 'query_activities',
      'click .remove_repo': 'remove_repo',
    },
    initialize: function(options) {
      console.debug('RepositoryView.initialize() full_name: ' + this.model.get('full_name'));
      this.repo_collection = options.repo_collection;
      this._filter_model = options.filter_model;
      this._query_activities = options.query_activities;
      this.$el.html('<div class="repo_header"></div>');
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'change:is_starred', this.update_filter_match);
      this.listenTo(this.model, 'destroy', this.remove);
      this.listenTo(this._filter_model, 'change:starred', this.update_filter_match);
      this.activities_queried = false;
      this.activitylist_folded = true;

      this.activity_collection = new namespace.ActivityCollection();
      this.listenTo(this.activity_collection, 'add', this.activity_collection_changed);
      this.listenTo(this.activity_collection, 'remove', this.activity_collection_changed);
      this.listenTo(this.activity_collection, 'reset', this.activity_collection_changed);
      this.listenTo(this.activity_collection, 'change:matches_filter', this.change_matches_filter);
      var view = new namespace.ActivityListView({
        collection: this.activity_collection,
        filter_model: this._filter_model,
      });
      this.$el.append(view.render().el);
      this.update_filter_match();
    },
    render: function() {
      console.debug('RepositoryView.render() full_name: ' + this.model.get('full_name'));
      this.$('.repo_header').html(this.template(this._get_render_data()));

      this.$('.repo_header .loader').hide();
      if (this.activitylist_folded) {
        this.$('.glyphicon-folder-open').hide();
        this.$('.activitylist').hide();
      } else {
        this.$('.glyphicon-folder-close').hide();
        this.$('.activitylist').show();
      }
      return this;
    },
    _get_render_data: function() {
      var data = this.model.toJSON();
      // can't use a default value in order to not overwrite values
      // when models are updated with new models from the provider
      if (!data['activity_summary']) {
        data['activity_summary'] = new namespace.ActivitySummary();
      }
      if (!data['matched_activity_summary']) {
        data['matched_activity_summary'] = new namespace.ActivitySummary();
      }
      return data;
    },
    update_filter_match: function() {
      console.debug('RepositoryView.update_filter_match()');
      var old_matches_filter = this.model.get('matches_filter');
      var matches_filter = this._filter_model.match_repo(this.model);
      if (matches_filter) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
      console.debug('RepositoryView.update_filter_match() ' + matches_filter);
      this.model.set({matches_filter: matches_filter});
    },
    skip_event: function(event) {
      event.stopPropagation();
    },
    toggle_activitylist: function() {
      console.log('RepositoryView.toggle_activitylist() full_name: ' + this.model.get('full_name'));
      if (!this.activities_queried) {
        this.query_activities();
      } else if (this.activitylist_folded) {
        this.show_activities();
      } else {
        this.hide_activities();
      }
    },
    reset_activities: function(event) {
      console.log('RepositoryView.reset_activities() full_name: ' + this.model.get('full_name'));
      if (event) {
        event.stopPropagation();
      }
      this.activities_queried = false;
      this.$('.repo_header .reset_activities').css('visibility', 'hidden');
      this.model.unset('activity_summary');
      this.model.unset('matched_activity_summary');
      this.hide_activities();
    },
    query_activities: function(event) {
      console.log('RepositoryView.query_activities() full_name: ' + this.model.get('full_name'));
      if (event) {
        event.stopPropagation();
      }
      this.$('.repo_header .query_activities').hide();
      this.$('.repo_header .loader').show();
      this._query_activities(this.model, this.activity_collection, $.proxy(this.query_activities_completed, this));
    },
    query_activities_completed: function(loaded) {
      console.log('RepositoryView.query_activities_completed() loaded: ' + loaded);
      this.$('.repo_header .query_activities').css('display', '');
      this.$('.repo_header .loader').hide();
      if (loaded === true) {
        this.$('.repo_header .reset_activities').css('visibility', 'visible');
        if (!this.activities_queried) {
          //this.show_activities();
          this.activities_queried = true;
          if (!this.activity_collection.length) {
            // manually trigger model update when no activities are found
            this.activity_collection_changed();
          }
        }
      }
    },
    show_activities: function() {
      console.debug('RepositoryView.show_activities() full_name: ' + this.model.get('full_name'));
      this.$('.glyphicon-folder-close').hide();
      this.$('.glyphicon-folder-open').show();
      if (this.activity_collection.length > 0) {
        this.$('.activitylist').show();
        var height = this.$('.activitylist').css('height', 'auto').css('height');
        this.$('.activitylist').css('height', 0);
        var activitylist = this.$('.activitylist');
        this.$('.activitylist').animate({'height': height + 'px'}, {speed: 200, queue: false, always: function(){
          activitylist.css('height', 'auto');
        }});
      }
      this.activitylist_folded = false;
    },
    hide_activities: function() {
      console.debug('RepositoryView.hide_activities() full_name: ' + this.model.get('full_name'));
      this.$('.glyphicon-folder-close').show();
      this.$('.glyphicon-folder-open').hide();
      var activitylist = this.$('.activitylist');
      this.$('.activitylist').animate({'height': '0px'}, {speed: 200, queue: false, always: function(){
        activitylist.hide();
      }});
      this.activitylist_folded = true;
    },
    activity_collection_changed: function() {
      console.debug('RepositoryView.activity_collection_changed() full_name: ' + this.model.get('full_name'));
      var summary = new namespace.ActivitySummary();
      this.activity_collection.each(function(activity_model, index) {
        summary.addActivityModel(activity_model);
      });
      this.model.set({'activity_summary': summary});
      this.update_matched_activity_summary();
    },
    update_matched_activity_summary: function() {
      console.debug('RepositoryView.update_matched_activity_summary() full_name: ' + this.model.get('full_name'));
      var summary = new namespace.ActivitySummary();
      this.activity_collection.each(function(activity_model, index) {
        if (activity_model.get('matches_filter')) {
          summary.addActivityModel(activity_model);
        }
      });
      console.debug('RepositoryView.update_matched_activity_summary() full_name: ' + this.model.get('full_name') + ' ' + summary);
      this.model.set({matched_activity_summary: summary});
    },
    change_matches_filter: function(activity_model) {
      console.debug('RepositoryView.change_matches_filter() full_name: ' + this.model.get('full_name') + ' activity: ' + activity_model.get('text').substr(0, 30));
      var summary = new namespace.ActivitySummary();
      summary.addActivitySummary(this.model.get('matched_activity_summary'));
      if (activity_model.get('matches_filter')) {
        console.debug('RepositoryView.change_matches_filter() full_name: ' + this.model.get('full_name') + ' add activity: ' + activity_model.get('text').substr(0, 30));
        summary.addActivityModel(activity_model);
        this.model.set({matched_activity_summary: summary});
      } else if (!activity_model.get('matches_filter') && activity_model.previous('matches_filter')) {
        console.debug('RepositoryView.change_matches_filter() full_name: ' + this.model.get('full_name') + ' remove activity: ' + activity_model.get('text').substr(0, 30));
        summary.removeActivityModel(activity_model);
        this.model.set({matched_activity_summary: summary});
      }
    },
    remove_repo: function(event) {
      console.log('RepositoryView.remove_repo() full_name: ' + this.model.get('full_name'));
      if (event) {
        event.stopPropagation();
      }
      this.repo_collection.remove(this.model);
    },
  });

  namespace.RepositoryListView = Backbone.View.extend({
    tagName: 'div',
    className: 'repolist',
    initialize: function(options) {
      console.debug('RepositoryListView.initialize()');
      this._filter_model = options.filter_model;
      this._query_activities = options.query_activities;
      this.listenTo(this.collection, 'add', this.addOne);
      this.listenTo(this.collection, 'reset', this.addAll);
      this.listenTo(this.collection, 'remove', this.removeOne);
    },
    render: function() {
      console.debug('RepositoryListView.render()');
      return this;
    },
    addOne: function(model) {
      var view = new namespace.RepositoryView({
        repo_collection: this.collection,
        model: model,
        filter_model: this._filter_model,
        query_activities: this._query_activities,
      });
      var index = this.collection.indexOf(model);
      var view_at_index = this._get_element_of_index(index);
      if (view_at_index.length) {
        console.debug('RepositoryListView.addOne() repo ' + model.get('full_name') + ' at index ' + index.toString());
        view_at_index.before(view.render().el);
      } else {
        console.debug('RepositoryListView.addOne() repo ' + model.get('full_name') + ' at the end');
        this.$el.append(view.render().el);
      }
    },
    addAll: function() {
      console.debug('RepositoryListView.addAll()');
      this.$el.html('');
      this.collection.each(this.addOne, this);
    },
    removeOne: function(model, collection, options) {
      console.debug('RepositoryListView.removeOne() repo: ' + model.get('full_name'));
      this._get_element_of_index(options.index).remove();
    },
    _get_element_of_index: function (index) {
      return this.$('>' + namespace.RepositoryView.prototype.tagName + ':eq(' + index.toString() + ')');
    }
  });


  /*
   * A group model has the following attributes:
   * - id
   * - name
   * - avatar_url
   * - starred_repos
   * - matched_activity_summary (populated by the GroupView, aggregated from the collection of RepositoryModels)
   *   matches_filter (populated by the GroupView)
   */
  namespace.GroupModel = Backbone.Model.extend({
    defaults: {
      'matched_activity_summary': new namespace.ActivitySummary(),
    },
  });

  namespace.GroupCollection = Backbone.Collection.extend({
    model: namespace.GroupModel,
    comparator: function(model) {
      return model.get('name').toLowerCase();
    },
  });

  namespace.GroupView = Backbone.View.extend({
    tagName: 'div',
    className: 'group',
    template: _.template($('#group-header-template').html()),
    events: {
      'click a': 'skip_event',
      'click .group_header': 'toggle_repolist',
      'click .query_repos': 'query_repos',
      'click .remove_group': 'remove_group',
    },
    initialize: function(options) {
      console.debug('GroupView.initialize() group: ' + this.model.get('name'));
      this.group_collection = options.group_collection;
      this._filter_model = options.filter_model;
      this._query_group_repos = options.query_group_repos;
      this._query_activities = options.query_activities;
      this.$el.html('<div class="group_header"></div>');
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'change:starred_repos', this.update_filter_match);
      this.listenTo(this.model, 'change:starred_repos', this.update_starred_repos);
      this.listenTo(this.model, 'destroy', this.remove);
      this.listenTo(this._filter_model, 'change:starred', this.update_filter_match);
      this.repolist_state = null;

      this.repository_collection = new namespace.RepositoryCollection();
      this.listenTo(this.repository_collection, 'add', this.add_repo);
      this.listenTo(this.repository_collection, 'remove', this.remove_repo);
      this.listenTo(this.repository_collection, 'reset', this.reset_repos);
      this.listenTo(this.repository_collection, 'change:matched_activity_summary', this.update_matched_activity_summary);
      var view = new namespace.RepositoryListView({
        collection: this.repository_collection,
        filter_model: this._filter_model,
        query_activities: this._query_activities,
      });
      this.$el.append(view.render().el);
      this.update_filter_match();
    },
    render: function() {
      console.debug('GroupView.render() group: ' + this.model.get('name'));
      this.$('.group_header').html(this.template(this.model.toJSON()));
      this.$('.group_header .loader').hide();
      if (this.repository_collection.length == 0) {
        this.$('.repolist').hide();
      }
      return this;
    },
    update_filter_match: function() {
      console.debug('GroupView.update_filter_match()');
      var old_matches_filter = this.model.get('matches_filter');
      var matches_filter = this._filter_model.match_group(this.model);
      if (matches_filter) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
      console.debug('GroupView.update_filter_match() ' + matches_filter);
      this.model.set({matches_filter: matches_filter});
      this.update_matched_activity_summary();
    },
    skip_event: function(event) {
      event.stopPropagation();
    },
    toggle_repolist: function() {
      console.log('GroupView.toggle_repolist() group: ' + this.model.get('name'));
      if (this.repolist_state === null) {
        this.query_repos();
      } else if (this.repolist_state) {
        this.hide_repos();
      } else {
        this.show_repos();
      }
    },
    query_repos: function(event) {
      console.debug('GroupView.query_repos() group: ' + this.model.get('name'));
      if (event) {
        event.stopPropagation();
      }
      this.$('.group_header .query_repos').hide();
      this.$('.group_header .loader').show();
      this._query_group_repos(this.model, this.repository_collection, $.proxy(this.query_repos_completed, this));
    },
    query_repos_completed: function() {
      this.$('.group_header .query_repos').css('display', '');
      this.$('.group_header .loader').hide();
    },
    show_repos: function() {
      console.debug('GroupView.show_repos() group: ' + this.model.get('name'));
      if (this.repository_collection.length > 0) {
        this.$('.repolist').show();
        var height = this.$('.repolist').css('height', 'auto').css('height');
        this.$('.repolist').css('height', 0);
        var repolist = this.$('.repolist');
        this.$('.repolist').animate({'height': height + 'px', 'margin-top': '5px'}, {speed: 200, queue: false, always: function(){
          repolist.css('height', 'auto');
        }});
        this.repolist_state = true;
      }
    },
    hide_repos: function() {
      console.debug('GroupView.hide_repos() group: ' + this.model.get('name'));
      var repolist = this.$('.repolist');
      this.$('.repolist').animate({'height': '0px', 'margin-top': '0px'}, {speed: 200, queue: false, always: function(){
        repolist.hide();
      }});
      this.repolist_state = false;
    },
    add_repo: function(repo_model) {
      console.debug('GroupView.add_repo() group: ' + this.model.get('name') + ' repo ' + repo_model.get('full_name'));
      this.show_repos();

      if (this._filter_model.match_repo(repo_model)) {
        var group_summary = this.model.get('matched_activity_summary')
        var repo_summary = repo_model.get('matched_activity_summary');
        group_summary.addActivitySummary(repo_summary);
        this.model.set({matched_activity_summary: group_summary});
      }
    },
    remove_repo: function(repo_model) {
      console.debug('GroupView.remove_repo() group: ' + this.model.get('name') + ' repo ' + repo_model.get('full_name'));
      if (this.repository_collection.length == 0) {
        this.hide_repos();
      }

      if (this._filter_model.match_repo(repo_model)) {
        var group_summary = this.model.get('matched_activity_summary')
        var repo_summary = repo_model.get('matched_activity_summary');
        group_summary.removeActivitySummary(repo_summary);
        this.model.set({matched_activity_summary: group_summary});
      }
    },
    reset_repos: function(repo_models) {
      console.debug('GroupView.reset_repos() group: ' + this.model.get('name'));
      if (this.repository_collection.length > 0) {
        this.show_repos();
      } else {
        this.hide_repos();
      }
      this.update_matched_activity_summary();
    },
    update_matched_activity_summary: function(repo_model) {
      console.debug('GroupView.update_matched_activity_summary() group: ' + this.model.get('name'));
      // can't use previous summary since for multiple adds the previous value is the same value which would result in increasing offsets
      // therefore not using the offset at all but recompute the sum every time
      var summary = new namespace.ActivitySummary();
      var filter_model = this._filter_model;
      this.repository_collection.each(function(repo_model, index) {
        if (filter_model.match_repo(repo_model)) {
          var repo_summary = repo_model.get('matched_activity_summary');
          if (repo_summary != null) {
            //console.debug('GroupView.update_matched_activity_summary() repo ' + repo_model.get('full_name'));
            summary.addActivitySummary(repo_summary);
          }
        }
      });
      //console.debug('GroupView.update_matched_activity_summary() group: ' + this.model.get('name') + ' all');
      this.model.set({matched_activity_summary: summary});
    },
    update_starred_repos: function() {
      console.debug('GroupView.update_starred_repos() group: ' + this.model.get('name'));
      var starred_repos = this.model.get('starred_repos');
      this.repository_collection.each(function(repo_model, index) {
        is_starred = starred_repos.indexOf(repo_model.get('name')) != -1;
        repo_model.set({is_starred: is_starred});
      });
    },
    remove_group: function(event) {
      console.log('GroupView.remove_group() full_name: ' + this.model.get('name'));
      if (event) {
        event.stopPropagation();
      }
      this.group_collection.remove(this.model);
    },
  });

  namespace.GroupListView = Backbone.View.extend({
    tagName: 'div',
    className: 'grouplist',
    initialize: function(options) {
      console.debug('GroupListView.initialize()');
      this._filter_model = null;
      this._query_groups = options.query_groups;
      this._query_group_repos = options.query_group_repos;
      this._query_activities = options.query_activities;
      this.listenTo(this.collection, 'add', this.addOne);
      this.listenTo(this.collection, 'reset', this.addAll);
      this.listenTo(this.collection, 'remove', this.removeOne);
    },
    set_filter_model: function(filter_model) {
      console.debug('GroupListView.set_filter_model()');
      this._filter_model = filter_model;
    },
    render: function() {
      console.debug('GroupListView.render()');
      return this;
    },
    query_groups: function() {
      console.log('GroupListView.query_groups()');
      this._query_groups(this.collection);
    },
    addOne: function(model) {
      var view = new namespace.GroupView({
        model: model,
        group_collection: this.collection,
        filter_model: this._filter_model,
        query_group_repos: this._query_group_repos,
        query_activities: this._query_activities,
      });
      var index = this.collection.indexOf(model);
      var view_at_index = this._get_element_of_index(index);
      if (view_at_index.length) {
        console.debug('GroupListView.addOne() group: ' + model.get('name') + ' at index ' + index.toString());
        view_at_index.before(view.render().el);
      } else {
        console.debug('GroupListView.addOne() group: ' + model.get('name') + ' at the end');
        this.$el.append(view.render().el);
      }
    },
    addAll: function() {
      console.debug('GroupListView.addAll()');
      this.$el.html('');
      this.collection.each(this.addOne, this);
    },
    removeOne: function(model, collection, options) {
      console.debug('GroupListView.removeOne() group: ' + model.get('name'));
      this._get_element_of_index(options.index).remove();
    },
    _get_element_of_index: function (index) {
      return this.$('>' + namespace.GroupView.prototype.tagName + ':eq(' + index.toString() + ')');
    }
  });


  /*
   * A filter model has the following attributes:
   * - starred
   * - age (in milliseconds)
   */
  namespace.FilterModel = Backbone.Model.extend({
    defaults: {
      'starred': false,
      'age': 365 * 24 * 60 * 60 * 1000,
    },
    match_group: function(group_model) {
      var starred = this.get('starred');
      if (!starred) {
        return true;
      }
      console.log('FilterModel.match_group() starred ' + group_model.get('name'));
      return group_model.get('starred_repos').length > 0;
    },
    match_repo: function(repo_model) {
      var starred = this.get('starred');
      if (!starred) {
        return true;
      }
      console.log('FilterModel.match_repo() starred ' + repo_model.get('name'));
      return repo_model.get('is_starred');
    },
    match_activity: function(activity_model) {
      var age = this.get('age');
      console.log('FilterModel.match_activity() age ' + age);
      if (age != 0) {
        if (Date.now() - age > activity_model.get('timestamp')) {
          console.log('FilterModel.match_activity() filter by age ' + activity_model.get('text').substr(0, 30));
          return false;
        }
      }
      return true;
    },
    persist: function() {
      console.debug('FilterModel.persist()');
      localStorage.setItem('filterModel', JSON.stringify(this.toJSON()));
    },
    restore: function() {
      console.debug('FilterModel.restore()');
      var string_data = localStorage.getItem('filterModel');
      if (string_data) {
        var data = JSON.parse(string_data);
        this.set(data);
        return true;
      }
      return false;
    },
  });

  namespace.FilterView = Backbone.View.extend({
    tagName: 'div',
    className: 'filter',
    template: _.template($('#filter-template').html()),
    events: {
      'change input': 'change_filter',
    },
    initialize: function() {
      console.debug('FilterView.initialize()');
      this.$el.html(this.template(this._get_render_data()));
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'change', this.persist);
      this.listenTo(this.model, 'destroy', this.remove);
    },
    render: function() {
      console.debug('FilterView.render()');
      this.$('.filter').html(this.template(this._get_render_data()));
      return this;
    },
    _get_render_data: function() {
      var data = this.model.toJSON();
      data['age_days'] = Math.round(Number(data['age']) / (24 * 60 * 60 * 1000));
      return data;
    },
    persist: function() {
      this.model.persist();
    },
    change_filter: function(event) {
      var name  = event.currentTarget.name;
      if (name == 'filter_starred') {
        var checked = event.currentTarget.checked;
        console.debug('FilterView.change_filter() starred: ' + checked);
        this.model.set({starred: checked});
      } else if (name == 'filter_age_days') {
        var value = event.currentTarget.value;
        console.debug('FilterView.change_filter() age days: ' + value);
        this.model.set({age: value * 24 * 60 * 60 * 1000});
      } else {
        console.warn('FilterView.change_filter() unknown filter name: ' + name);
      }
    },
  });

  /*
   * A summary model has the following attributes:
   * - matched_activity_summary
   */
  namespace.SummaryModel = Backbone.Model.extend({
    defaults: {
      'matched_activity_summary': new namespace.ActivitySummary(),
    },
  });

  namespace.SummaryView = Backbone.View.extend({
    tagName: 'div',
    className: 'summary',
    template: _.template($('#summary-template').html()),
    initialize: function() {
      console.debug('SummaryView.initialize()');
      this.group_collections = [];
      this.$el.html(this.template(this.model.toJSON()));
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      console.debug('SummaryView.render()');
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    add_group_collection: function(group_collection) {
      console.debug('SummaryView.add_group_collection()');
      this.group_collections.push(group_collection);
      this.listenTo(group_collection, 'add', this.addOne);
      this.listenTo(group_collection, 'reset', this.update);
      this.listenTo(group_collection, 'remove', this.removeOne);
    },
    addOne: function(group_model) {
      console.debug('SummaryView.addOne()');
      this.listenTo(group_model, 'change:matched_activity_summary', this.update);
      return this;
    },
    removeOne: function(model, collection, options) {
      console.debug('SummaryView.removeOne()');
      this.update();
      return this;
    },
    update: function() {
      console.debug('SummaryView.update()');
      var matched_summary = new namespace.ActivitySummary();
      _(this.group_collections).each(function(group_collection) {
        console.debug('group_collection = ' + group_collection + ' ' + group_collection.length);
        group_collection.each(function(group_model, index) {
          console.debug('group_model = ' + group_model);
          matched_summary.addActivitySummary(group_model.get('matched_activity_summary'));
        });
      });
      console.debug('matched_summary: ' + (matched_summary.issues_opened + matched_summary.issues_closed + matched_summary.issue_comments + matched_summary.pull_requests_opened + matched_summary.pull_requests_closed + matched_summary.pull_request_comments + matched_summary.tags + matched_summary.commits));
      this.model.set({'matched_activity_summary': matched_summary});
    },
  });


  namespace.ActivitiesDashboardView = Backbone.View.extend({
    tagName: 'div',
    className: 'activities_dashboard',
    template: _.template($('#activities-dashboard').html()),
    initialize: function() {
      console.debug('ActivitiesDashboardView.initialize()');
      this.$el.html(this.template());

      this._summary_model = new namespace.SummaryModel();
      this._summary_view = new namespace.SummaryView({model: this._summary_model});
      this.$('.provider_status').append(this._summary_view.render().el);

      this._filter_model = new namespace.FilterModel();
      this._filter_model.restore();
      this._filter_view = new namespace.FilterView({model: this._filter_model});
      this.$('.provider_status').append(this._filter_view.render().el);
      this._providers = [];
    },
    render: function() {
      console.debug('ActivitiesDashboardView.render()');
      return this;
    },
    get_filter_model: function() {
      console.debug('ActivitiesDashboardView.get_filter_model()');
      return this._filter_model;
    },
    add_provider: function(provider) {
      console.log('ActivitiesDashboardView.add_provider() ' + provider.get_name());
      this.$('.provider_status').append(provider.get_status_view().render().el);
      this.$('.provider_login').append(provider.get_login_view().render().el);
      this.$('.provider_dashboard').append(provider.get_dashboard_view().render().el);
      this._summary_view.add_group_collection(provider.get_dashboard_view().group_collection);
      this._providers.push(provider);
    },
  });

})(window.activities_dashboard = window.activities_dashboard || {});
