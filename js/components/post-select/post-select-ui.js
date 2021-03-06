import React from 'react';
import PropTypes from 'prop-types';
import wp from 'wp';
import _get from 'lodash/get';
import _extend from 'lodash/extend';
import _isEqual from 'lodash/isEqual';

import PostSelectUIFilters from './post-select-ui-filters';
import PostList from './post-list';
import termFilters from './term-filters';

const { Button } = wp.components;
const { __ } = wp.i18n;
const { Spinner } = wp.components;

class PostSelectUI extends React.Component {
	state = {
		posts: [],
		isLoading: false,
		filters: {},
	}

	componentWillMount() {
		this.initPostsCollection();
	}

	componentDidUpdate( prevProps, prevState ){
		if ( ! _isEqual( prevState.filters, this.state.filters ) ) {
			this.fetchPostsCollection();
		}
	}

	componentWillUnmount() {
		this.postsCollection.off();
		delete this.postsCollection;
	}

	render() {
		const { posts, isLoading } = this.state;
		const { selectedPosts, togglePostSelected } = this.props;

		return <div className="menu-container">
			<div className="menu">
				<PostSelectUIFilters onUpdate={ filters => this.setState( { filters } ) }/>
			</div>
			<div>
				{ isLoading && <Spinner /> }
				{ ! isLoading && this.hasPrev() && <Button
					className="prev-page"
					isLarge={ true }
					onClick={ () => this.prevPostsPage() }
					disabled={ isLoading }
				>Previous page</Button> }
				{ ! isLoading && <PostList
					posts={ posts }
					selectedPosts={ selectedPosts }
					onToggleSelectedPosts={ post => togglePostSelected( post ) }
				/> }
				{ ! isLoading && this.hasMore() && <Button
					className="next-page"
					isLarge={true}
					onClick={ () => this.nextPostsPage() }
				>Next page</Button> }
			</div>
		</div>
	}

	postCollectionFetchData() {
		const args = {
			per_page: 25,
		};

		const search = _get( this.state, 'filters.search' );
		if ( search && search.length ) {
			args.search = search;
		}

		termFilters.forEach( termFilter => {
			const terms = _get( this.state, `filters.${termFilter.slug}` );
			if ( terms ) {
				args[ termFilter.rest ] = terms.join(',');
			}
		} );

		return args;
	}

	initPostsCollection() {
		this.setState({ isLoading: true });

		const Collection = _get(
			wp.api.collections,
			this.props.collectionType,
			wp.api.collections.Posts
		);

		this.postsCollection = new Collection();

		this.postsCollection.on( 'add remove update change destroy reset sort', () => this.setState({
			posts: this.postsCollection.toJSON()
		}));

		this.postsCollection.on( 'request', () => this.setState( { isLoading: true } ) );
		this.postsCollection.on( 'sync', () => this.setState( { isLoading: false } ) );

		this.postsCollection.fetch( { data: this.postCollectionFetchData() } );
	}

	fetchPostsCollection() {
		this.postsCollection.fetch( { data: this.postCollectionFetchData() } );
	}

	nextPostsPage( options = {} ) {
		this.setState( { page: this.state.page += 1 });
		this.postsCollection.more( options );
	}

	/**
	 * Fetches the prev page of objects if a new page exists.
	 *
	 * @param {data: {page}} options.
	 * @returns {*}.
	 */
	prevPostsPage( options = {} ) {
		options.data = options.data || {};
		_extend( options.data, this.postCollectionFetchData() );

		if ( 'undefined' === typeof options.data.page ) {
			if ( ! this.hasPrev() ) {
				return false;
			}

			if ( null === this.postsCollection.state.currentPage || this.postsCollection.state.currentPage <= 1 ) {
				options.data.page = 1;
			} else {
				options.data.page = this.postsCollection.state.currentPage - 1;
			}
		}

		this.postsCollection.fetch( options );
	}

	/**
	 * Returns true if there are previous pages of objects available.
	 *
	 * @returns null|boolean.
	 */
	hasMore() {
		return this.postsCollection.hasMore();
	}

	/**
	 * Returns true if there are previous pages of objects available.
	 *
	 * @returns null|boolean.
	 */
	hasPrev() {
		if ( null === this.postsCollection.state.currentPage ) {
			return null;
		} else {
			return ( this.postsCollection.state.currentPage > 1 );
		}
	}
}

export default PostSelectUI;
